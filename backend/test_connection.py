import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def test_connection():
    load_dotenv()
    
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "hemut_qa")
    
    print(f"Testing connection to: {MONGODB_URL}")
    print(f"Database: {DATABASE_NAME}")
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # Test collections
        collections = await db.list_collection_names()
        print(f"📁 Collections: {collections}")
        
        # Count documents
        question_count = await db.questions.count_documents({})
        user_count = await db.users.count_documents({})
        
        print(f"📊 Questions: {question_count}")
        print(f"👥 Users: {user_count}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())