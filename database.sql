CREATE DATABASE email;
USE email;

CREATE TABLE emails (
  id CHAR(36) PRIMARY KEY,         -- UUID as primary key
  senderId CHAR(36) NOT NULL,      -- Foreign key to the sender (User)
  recipientId CHAR(36) NOT NULL,   -- Foreign key to the recipient (User)
  subject VARCHAR(255) NOT NULL,   -- Email subject
  body TEXT NOT NULL,              -- Email body
  isRead BOOLEAN DEFAULT FALSE,    -- Flag for whether the email is read
  isStarred BOOLEAN DEFAULT FALSE, -- Flag for starred emails
  isTrash BOOLEAN DEFAULT FALSE,   -- Flag for emails in trash
  isDeleted BOOLEAN DEFAULT FALSE, -- Flag for deleted emails
  folder ENUM('inbox', 'sent', 'drafts', 'trash') DEFAULT 'inbox', -- Folder for the email
  labels TEXT,                     -- JSON string to store labels
  attachments TEXT,                -- JSON string to store attachments
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id),
  FOREIGN KEY (recipientId) REFERENCES users(id)
);

CREATE TABLE support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  createdAt DATETIME NOT NULL
);


ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user';

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,         -- UUID or unique string
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),         -- hashed password (not shown here)
  isBlocked BOOLEAN DEFAULT FALSE,    -- false = active, true = blocked/rejected
  isApproved BOOLEAN DEFAULT FALSE,   -- admin approval status
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastLogin DATETIME NULL,             -- last active time
  approvedAt DATETIME NULL             -- when admin approved the user
);


CREATE TABLE otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN isVerified BOOLEAN DEFAULT FALSE,
ADD COLUMN verificationToken VARCHAR(255) NULL;

ALTER TABLE email_otps ADD COLUMN isVerified BOOLEAN DEFAULT 0;

CREATE TABLE email_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emailId CHAR(36),
  userId INT,                           -- recipient user ID
  type ENUM('to', 'cc', 'bcc') DEFAULT 'to',  -- recipient type
  FOREIGN KEY (emailId) REFERENCES emails(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  token TEXT,
  expiresAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);


CREATE DATABASE email;

SELECT * FROM email.users;

INSERT INTO email.users (firstName, lastName, email, password) VALUES ('Test', 'User', 'test1234@example.com', 'hashed');

SELECT user, host, authentication_string FROM mysql.users WHERE user = 'root';

-----------------------------------------
INSERT INTO users (id, firstName, lastName, email) VALUES
('uuid-1', 'John', 'Doe', 'john@example.com'),
('uuid-2', 'Jane', 'Smith', 'jane@example.com');

INSERT INTO emails (id, senderId, recipientId, subject, body, isRead, isStarred, isTrash, isDeleted, folder, created_at) VALUES
('uuid-email-1', 'uuid-1', 'uuid-2', 'Welcome Email', 'Hello, welcome to our platform!', FALSE, FALSE, FALSE, FALSE, 'inbox', '2025-05-29 12:00:00'),
('uuid-email-2', 'uuid-2', 'uuid-1', 'Meeting Invite', 'Please join our meeting tomorrow.', TRUE, TRUE, FALSE, FALSE, 'sent', '2025-05-28 10:00:00'),
('uuid-email-3', 'uuid-1', 'uuid-2', 'Draft Email', 'This is a draft.', FALSE, FALSE, FALSE, FALSE, 'drafts', '2025-05-27 09:00:00'),
('uuid-email-4', 'uuid-2', 'uuid-1', 'Trashed Email', 'This is in trash.', FALSE, FALSE, TRUE, FALSE, 'trash', '2025-05-26 08:00:00');

-----------------------------------------------------------------

INSERT INTO users (
  id, firstName, lastName, email, password_hash, isBlocked, isApproved, createdAt, updatedAt
) VALUES (
  UUID(), 'Admin', 'User', 'admin1234@gmail.com', '$2y$10$aBcdEfGhIjKlMnOpQrStuvWxYz0123456789ABCD.EFGHIJKLmnopq',  -- bcrypt hash of 'admin1234'
  FALSE, TRUE, NOW(), NOW()
);

INSERT INTO users 
        (id, firstName, lastName, email, password_hash, isBlocked, isApproved, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())