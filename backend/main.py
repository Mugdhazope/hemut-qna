from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
import json
from bson import ObjectId
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

app = FastAPI(title="Hemut Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

required_envs = ["MONGODB_URL", "DATABASE_NAME", "SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES"]
missing = [e for e in required_envs if not os.getenv(e)]

if missing:
    raise RuntimeError(f"Missing environment variables: {missing}")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

@app.on_event("startup")
async def startup_event():
    try:
        # Test database connection on startup
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        # Don't exit, let the app start anyway for debugging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/")
async def root():
    return {
        "status": "healthy", 
        "message": "Hemut Q&A API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "questions": "/api/questions",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    try:
        # Test database connection
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/ping")
async def ping():
    # Simple endpoint that doesn't require database
    return {"status": "ok", "message": "pong"}

def create_access_token(data: dict):
    to_encode = data.copy()
    EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        return user
    except JWTError:
        return None

@app.post("/api/register")
async def register(user_data: dict):
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data["password"])
    user_doc = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/login")
async def login(credentials: dict):
    user = await db.users.find_one({"email": credentials["email"]})
    if not user or not pwd_context.verify(credentials["password"], user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/questions")
async def submit_question(question_data: dict):
    if not question_data.get("message", "").strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    question_doc = {
        "author": question_data.get("author", "Anonymous"),
        "message": question_data["message"],
        "status": "pending",
        "created_at": datetime.utcnow(),
        "answers": []
    }
    
    result = await db.questions.insert_one(question_doc)
    question_doc["_id"] = str(result.inserted_id)
    question_doc["created_at"] = question_doc["created_at"].isoformat()
    
    await manager.broadcast(json.dumps({
        "type": "new_question",
        "data": question_doc
    }))
    
    return {"message": "Question submitted successfully", "id": str(result.inserted_id)}

@app.get("/api/questions")
async def get_questions():
    questions = []
    async for question in db.questions.find().sort([("status", 1), ("created_at", -1)]):
        question["_id"] = str(question["_id"])
        question["created_at"] = question["created_at"].isoformat()
        questions.append(question)
    
    escalated = [q for q in questions if q["status"] == "escalated"]
    pending = [q for q in questions if q["status"] == "pending"]
    answered = [q for q in questions if q["status"] == "answered"]
    
    return escalated + pending + answered

@app.post("/api/questions/{question_id}/answer")
async def add_answer(question_id: str, answer_data: dict):
    if not answer_data.get("answer", "").strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")
    
    answer = {
        "author": answer_data.get("author", "Anonymous"),
        "content": answer_data["answer"],
        "created_at": datetime.utcnow()
    }
    
    await db.questions.update_one(
        {"_id": ObjectId(question_id)},
        {"$push": {"answers": answer}}
    )
    
    question = await db.questions.find_one({"_id": ObjectId(question_id)})
    question["_id"] = str(question["_id"])
    question["created_at"] = question["created_at"].isoformat()
    for ans in question["answers"]:
        ans["created_at"] = ans["created_at"].isoformat()
    
    await manager.broadcast(json.dumps({
        "type": "question_updated",
        "data": question
    }))
    
    return {"message": "Answer added successfully"}

@app.put("/api/questions/{question_id}/status")
async def update_question_status(question_id: str, status_data: dict, current_user = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Admin access required")
    
    valid_statuses = ["pending", "escalated", "answered"]
    if status_data["status"] not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.questions.update_one(
        {"_id": ObjectId(question_id)},
        {"$set": {"status": status_data["status"]}}
    )
    
    question = await db.questions.find_one({"_id": ObjectId(question_id)})
    question["_id"] = str(question["_id"])
    question["created_at"] = question["created_at"].isoformat()
    for ans in question["answers"]:
        ans["created_at"] = ans["created_at"].isoformat()
    
    await manager.broadcast(json.dumps({
        "type": "question_updated",
        "data": question
    }))
    
    return {"message": "Status updated successfully"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)