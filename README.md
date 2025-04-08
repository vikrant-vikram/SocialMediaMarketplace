![Man This Sucks](https://media.tenor.com/WO6GwQWJRhkAAAAM/user-password.gif)


Here’s your README.md file formatted properly for GitHub:

⸻

🚀 Node.js Express Startup Guide

A secure and scalable Node.js backend using Express, MongoDB, and additional middleware for authentication, logging, and file uploads.

📌 Features

✅ User authentication (Session-based)
✅ Secure file uploads (Multer)
✅ Logging with Winston
✅ CSRF Protection
✅ Admin role management
✅ WebSocket support with Socket.io

⸻

📂 Folder Structure

/your-project
│── /models                # Database models (Mongoose)
│── /public                # Public assets (CSS, JS, images)
│── /uploads               # File uploads (profile pictures, media)
│── /routes                # Route handlers
│── server.js              # Main server file
│── .env                   # Environment variables
│── package.json           # Project dependencies
│── README.md              # Documentation
│── logs.txt               # Log file (Winston)



⸻

🛠 Prerequisites

Before starting the server, ensure you have the following installed:
	•	Node.js (v16 or later recommended)
	•	MongoDB (Local or MongoDB Atlas)
	•	npm (Comes with Node.js)
	•	A .env file with required environment variables

⸻

📥 Installation

1️⃣ Clone the Repository

git clone https://github.com/your-repo.git
cd your-project

2️⃣ Install Dependencies

npm install

3️⃣ Configure Environment Variables

Create a .env file in the root directory and add:

PORT=3000
MONGOOSE_DBSERVER=mongodb://localhost:27017/your-db-name
SECRET=your-secret-key
STRIPE_PRIVATE_KEY=your-stripe-secret
GMAIL_ID=your-email@gmail.com
GMAIL_PASSWORD=your-email-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
NODE_ENV=development

🔹 Note: Replace values with actual credentials.

⸻

🚀 Running the Server

Development Mode (Auto-restart)

npm run dev

Production Mode

npm start



⸻

 API Endpoints

Method	Endpoint	Description
GET	/	Home Route
POST	/login	User Login
POST	/register	User Registration
GET	/logout	User Logout
GET	/profile	Get User Profile



⸻

 Troubleshooting
	•	MongoDB connection issues?
Ensure MongoDB service is running:

mongod


	•	.env variables not loading?
Check if dotenv is installed:

npm install dotenv


	•	App crashes?
Check logs.txt for errors.

⸻




# CSE 345/545 Foundations to Computer Security

## Course Project Requirements
**Social Media Marketplace**

### 1. Introduction
The Social Media Platform is intended to provide end-to-end security for group interactions, private messages, media sharing, and P2P Marketplace. The goal is to build a robust system that ensures confidentiality, integrity, and availability of all user communications—while integrating user validation mechanisms, OTP-based authentication, and PKI for secure operations.

### 2. Requirements
Below are the key requirements, reimagined for a messaging and media-sharing application:

#### 3. End-to-End Encrypted Conversations
- Direct messaging (one-to-one).
- Group messaging (many-to-many).
- Optional ephemeral (disappearing) messages or stories.

#### 4. Secure Media-Sharing
- Users can share photos, videos, voice notes, or documents privately.
- All shared content must be encrypted in transit (HTTPS/SSL/TLS).
- The system may optionally implement end-to-end encryption for attachments to provide additional security.

#### 5. User Identity and Validation
- Users must verify their email address and mobile number during registration using OTP-based verification.
- User accounts should include fields such as username, profile picture, and optional public bio.
- The system should flag suspicious activities such as repeated login failures or anomalous behavior for admin review.

#### 6. Social Features
- Follow or Friend Requests: Users can connect with each other.
- Search for users by username, hashtags, or public profile info.
- Block or Report suspicious accounts or content to the admin.

#### 7. P2P Marketplace
- Listing of artifacts for sale.
- Search functionality.
- Payment gateway to facilitate purchases.

#### 8. Admin & Moderation
- An Admin dashboard to view and manage all users (verified or unverified).
- Admin can suspend or remove accounts for violating content guidelines.

### Additional Functionalities / Security Mandates
- **Public Key Certificates (PKI)**
  - The platform must use HTTPS (TLS/SSL) to secure data in transit.
  - At least two functions (e.g., account creation, password reset, or certain message-verification steps) must use PKI to ensure authenticity and integrity.

- **OTP with Virtual Keyboard**
  - For at least two high-sensitivity transactions or actions (e.g., finalizing account re-verification, password reset, or admin-level actions), require an OTP that users must enter through a virtual keyboard to mitigate keylogging risks.

- **Secure Logging & Audit**
  - Log all critical actions (user registration, admin moderation, suspicious content flags) in a secure manner (tamper-resistant logs).

- **Defenses Against Attacks**
  - Apply standard security best practices against SQL injection, XSS, CSRF, session hijacking, etc.

- **Data Storage Compliance**
  - Do not store plain-text passwords or raw credit card data (if in-app purchases or premium features are introduced).
  - Use hashed/salted passwords and tokenized payment methods if needed.

- **Scalability & Simultaneous Access**
  - Multiple users should be able to exchange messages, upload media, and search the platform concurrently without compromising security.

### User Roles

#### Regular Users
- **Sign Up / Log In**: Validate account via email and OTP verification.
- **Messaging**: Send, receive, and manage private/group messages.
- **Media Sharing**: Upload images/videos in direct or group chats.
- **Profile Management**: Maintain personal details, handle friend/follow requests.
- **Report / Block**: Malicious or spam users.

#### Admin (Platform Moderators)
- **User Management**: View all user accounts, handle suspicious activity.
- **Moderation**: Remove or suspend abusive/spam accounts based on legal requirements.
- **Verification**: Handle exceptions or manual checks.
- **Security Audits**: Access secure logs, verify system integrity.

### Programming Languages and Frameworks
- **Operating System**: Ubuntu (will be provided to you)
- **Database**: MySQL, PostgreSQL, MongoDB, or SQLite (others with TA approval).
- **Web Server**: Nginx, Apache, or IIS (others with TA approval).
- **Languages/Frameworks**: Any

### Milestones & Timeline (January–April)
Your TAs will evaluate your progress in regular check-ins and at designated milestone demos. Below is the milestone schedule:

#### January Milestone [No Credit] (31 Jan)
1. **Set Up Technology Stack**
   - Choose OS, database, web server, and programming language(s).
   - Configure HTTPS with your own certificate authority or a self-signed certificate.
2. **Prototype Deployment**
   - Deploy a simple “Hello World” or skeleton website on the VM/server with SSL/TLS.

#### February Milestone [2.5%] (Feb 28)
1. **Basic User Flows**
   - Implement User Registration & Login (with secure password handling).
   - Provide Profile Management (update username, profile picture).
2. **Messaging Prototype**
   - Enable 1:1 direct messaging with a basic UI.
   - Store messages securely in the database (encrypted).
3. **Admin Dashboard (Basic)**
   - View a list of registered users.
   - Manually verify or reject user documents (if not auto-verified).







# How to Setup
 Download the requirements 

``` pip install -r requirements.txt ```
