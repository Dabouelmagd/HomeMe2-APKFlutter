# 🏠 HomeMe - Complete Residential Compound Management Solution

[![Build Status](https://github.com/YOUR_USERNAME/homeme/workflows/Build%20HomeMe%20Desktop%20App/badge.svg)](https://github.com/YOUR_USERNAME/homeme/actions)
[![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/homeme)](https://github.com/YOUR_USERNAME/homeme/releases)

HomeMe is a comprehensive residential compound management solution that enables efficient community management with features for both administrators and residents.

## ✨ Features

### 🔧 For Administrators
- **Compound Management** - Manage compound settings and branding
- **Residence Creation** - Create individual residence accounts with profile pictures
- **Registration Links** - Send secure registration links to new residents
- **Family Management** - Oversee all family units and members
- **Service Management** - Manage service providers and bookings
- **Financial Management** - Track payments and billing
- **Message Center** - Send announcements and notifications

### 👥 For Residents
- **Family Management** - Add family members with photos and birthdays
- **Profile Pictures** - Upload and manage family photos
- **Service Booking** - Book services with priority options and payments
- **Chat & Messaging** - Direct communication with administration
- **Utility Bills** - View and manage utility payments
- **File Gallery** - Access shared documents and files
- **Multi-language Support** - English, Arabic, and French

## 🚀 Installation

### Windows Desktop App
1. Go to [Releases](https://github.com/YOUR_USERNAME/homeme/releases)
2. Download `HomeMe Setup 1.0.0.exe`
3. Run the installer and follow the setup wizard
4. Launch HomeMe from desktop or Start Menu

### Web Application (PWA)
- Visit the web app URL
- Install as PWA on mobile devices (Add to Home Screen)

### From Source
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/homeme.git
cd homeme

# Install dependencies
yarn install

# Start development server
yarn start

# Build for production
yarn build
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Yarn package manager
- MongoDB (for backend)
- Python 3.8+ (for backend API)

### Project Structure
```
homeme/
├── frontend/          # React web application
├── backend/           # FastAPI Python backend
├── .github/           # GitHub Actions workflows
└── docs/              # Documentation
```

### Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/ui
- **Backend:** FastAPI, MongoDB, WebSockets
- **Desktop:** Electron
- **Mobile:** PWA with Capacitor
- **Build:** GitHub Actions, Electron Builder

## 📦 Building Desktop Apps

### Automatic Builds (GitHub Actions)
1. Push to main branch or create a tag
2. GitHub Actions automatically builds for Windows, macOS, and Linux
3. Download from Actions tab or Releases

### Manual Build
```bash
# Build React app
yarn build

# Build desktop app
yarn electron-dist
```

## 🏗️ Architecture

### Backend Features
- **User Management** - Authentication and authorization
- **Family System** - Multi-member family management
- **File Storage** - Profile pictures and document storage
- **Real-time Communication** - WebSocket chat implementation
- **Service Booking** - Complete booking and payment system
- **Multi-tenancy** - Multiple compound support

### Frontend Features
- **Responsive Design** - Mobile-first approach
- **PWA Capabilities** - Offline functionality
- **Multi-language** - i18n support
- **Real-time Updates** - WebSocket integration
- **Modern UI** - Clean, professional interface

## 🔐 Security

- JWT-based authentication
- Role-based access control (Admin/Resident)
- Secure file uploads
- Input validation and sanitization
- HTTPS/WSS encryption

## 🌍 Internationalization

Supported languages:
- 🇺🇸 English
- 🇸🇦 Arabic (RTL support)
- 🇫🇷 French

## 📱 Platform Support

- **Windows** - Native desktop app with installer
- **macOS** - Native macOS app (.dmg)
- **Linux** - AppImage distribution
- **Web** - Modern browsers with PWA support
- **Mobile** - Android APK and iOS PWA

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@homeme.app
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/homeme/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/YOUR_USERNAME/homeme/discussions)

## 🙏 Acknowledgments

- Built with React and FastAPI
- UI components from Shadcn/ui
- Icons from Heroicons
- Desktop app powered by Electron

---

Made with ❤️ for better community management
