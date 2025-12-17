#!/usr/bin/env python3

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "hemut_qa")

print(f"🔧 Connecting to MongoDB...")
print(f"   URL: {MONGODB_URL}")
print(f"   Database: {DATABASE_NAME}")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    try:
        # Connect to MongoDB with SSL settings
        client = AsyncIOMotorClient(MONGODB_URL, tlsAllowInvalidCertificates=True)
        db = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        
        # Admin user details
        admin_data = {
            "username": "admin",
            "email": "admin@hemut.com",
            "password": "admin123",  # Will be hashed
        }
        
        print(f"\n👤 Creating admin user:")
        print(f"   Username: {admin_data['username']}")
        print(f"   Email: {admin_data['email']}")
        print(f"   Password: {admin_data['password']}")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": admin_data["email"]})
        if existing_user:
            print(f"⚠️  User with email {admin_data['email']} already exists")
            print(f"   User ID: {existing_user['_id']}")
            print(f"   Username: {existing_user['username']}")
            return
        
        # Hash password
        hashed_password = pwd_context.hash(admin_data["password"])
        
        # Create user document
        user_doc = {
            "username": admin_data["username"],
            "email": admin_data["email"],
            "password": hashed_password,
            "created_at": datetime.utcnow()
        }
        
        # Insert user
        result = await db.users.insert_one(user_doc)
        
        print(f"✅ Admin user created successfully!")
        print(f"   User ID: {result.inserted_id}")
        print(f"   Username: {admin_data['username']}")
        print(f"   Email: {admin_data['email']}")
        print(f"   Password: {admin_data['password']}")
        
        # Verify user was created
        created_user = await db.users.find_one({"_id": result.inserted_id})
        if created_user:
            print(f"\n🔍 Verification:")
            print(f"   ✅ User found in database")
            print(f"   ✅ Password hash: {created_user['password'][:20]}...")
            print(f"   ✅ Created at: {created_user['created_at']}")
        
        # Show login instructions
        print(f"\n🚀 How to Login:")
        print(f"   1. Go to: https://hemut-qna-git-main-mugdhazopes-projects.vercel.app/admin")
        print(f"   2. Click 'Login' tab")
        print(f"   3. Enter:")
        print(f"      Email: {admin_data['email']}")
        print(f"      Password: {admin_data['password']}")
        print(f"   4. Click 'Login'")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin_user())