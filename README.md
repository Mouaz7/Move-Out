
# MoveOut Project

MoveOut is a web-based platform that helps users organize and manage their moving process by creating customizable labels for their moving boxes. Each label includes text, images, or audio, with an associated QR code for easy identification and secure sharing. Specialized insurance labels are also available to track valuable items.

## Key Features

- **User Registration**: Register securely using email verification or sign in with Google OAuth.
- **Label Creation**: Users can create labels with text, images, or audio content to describe what's inside their moving boxes.
- **QR Codes**: Every label is automatically linked to a QR code, enabling quick access to box details via scanning.
- **Secure Label Sharing**: Share labels securely with others using a PIN-protected system.
- **Insurance Labels**: Create specialized labels for high-value items, allowing for detailed listings and currency values.
- **Account Management**: Users can update or deactivate their profiles, with automatic deactivation of inactive accounts after one month.

## Technologies Used

- **Frontend**: 
  - EJS (for dynamic HTML rendering)
  - CSS (for styling the user interface)
  
- **Backend**:
  - Node.js and Express (server-side logic and routing)
  - MySQL (database management for users, labels, and content)

- **Additional Tools**:
  - QR Code Generation
  - Password hashing and PIN-based sharing for added security
  - Git for version control and collaboration

## Installation Instructions

To run the MoveOut project locally, follow these steps:

1. **Install Node.js and npm**:

   - **Windows**: Download from the [Node.js website](https://nodejs.org/) and run the installer.
   - **macOS**: Install Node.js using Homebrew:  
     ```bash
     brew install node
     ```
   - **Linux**: Install Node.js via your package manager:  
     ```bash
     sudo apt update
     sudo apt install nodejs npm
     ```

   Verify the installation with:
   ```bash
   node -v
   npm -v
   ```

2. **Install MariaDB**:

   - **Windows**: Download and install from the [MariaDB website](https://mariadb.com/download/).
   - **macOS**:  
     ```bash
     brew install mariadb
     brew services start mariadb
     ```
   - **Linux**:  
     ```bash
     sudo apt update
     sudo apt install mariadb-server
     sudo systemctl start mariadb
     ```

   Secure the installation:
   ```bash
   sudo mysql_secure_installation
   ```

3. **Clone the repository**:
   ```bash
   git clone https://github.com/Mouaz7/moveout.git
   cd moveout
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Configure environment variables**:

   Create a `.env` file in the root directory with the following:
   ```
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_session_secret
   ```

6. **Update Database Configuration**:

   Update `config.json` with your local hostname and credentials:
   ```json
    {
        "host": "localhost",
        "user": "dbadm",
        "password": "P@ssw0rd",
        "database": "moveout",
        "connectionLimit": 10,
        "connectTimeout": 30000  
    }
   ```
   Ensure your MariaDB username and password match the configuration.

7. **Run the Application**:

   Start the server:
   ```bash
   npm start
   ```

   Open the browser and visit `http://localhost:1338/login` to access the app.

8. **Reset the Database**:

   If needed, reset the database by running:
   ```bash
   mariadb < reset.sql
   ```

## Usage

- **Register/Login**: Create an account with your email or Google.
- **Create Labels**: Generate labels with text, images, or audio content for your boxes.
- **Scan QR Codes**: Access label details by scanning the associated QR codes.
- **Share Labels**: Securely share labels by generating a PIN.

## License

This project is licensed under the MIT License.
