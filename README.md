# BlockGuardian

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/quantsingularity/BlockGuardian/cicd.yml?branch=main&label=CI/CD&logo=github)
[![Test Coverage](https://img.shields.io/badge/coverage-79%25-brightgreen)](https://github.com/quantsingularity/BlockGuardian/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Blockchain Security & Monitoring Platform

BlockGuardian is a comprehensive blockchain security and monitoring platform that helps organizations protect their blockchain assets, detect vulnerabilities, and ensure compliance with regulatory requirements.

<div align="center">
  <img src="docs/images/BlockGuardian_dashboard.bmp" alt="BlockGuardian Dashboard" width="80%">
</div>

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [Key Scripts](#key-scripts)
- [Infrastructure](#infrastructure)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

BlockGuardian provides a robust set of tools for monitoring blockchain networks, analyzing smart contract vulnerabilities, detecting suspicious transactions, and ensuring compliance with regulatory requirements. The platform combines advanced security techniques with user-friendly interfaces to make blockchain security accessible to organizations of all sizes.

## Project Structure

The project is organized into several main components:

```
BlockGuardian/
├── code/                   # Core backend logic, services, and shared utilities
├── docs/                   # Project documentation
├── infrastructure/         # DevOps, deployment, and infra-related code
├── mobile-frontend/        # Mobile application
├── web-frontend/           # Web dashboard
├── scripts/                # Automation, setup, and utility scripts
├── LICENSE                 # License information
├── README.md               # Project overview and instructions
└── tools/                  # Formatter configs, linting tools, and dev utilities
```

## Key Features

### Security Monitoring

- **Real-time Transaction Monitoring**: Track and analyze blockchain transactions as they occur
- **Anomaly Detection**: Identify suspicious patterns and potential security threats
- **Smart Contract Auditing**: Automated and manual auditing tools for smart contract code
- **Vulnerability Scanning**: Detect common security vulnerabilities in blockchain applications

### Compliance & Governance

- **Regulatory Compliance**: Tools to ensure adherence to relevant regulations (GDPR, AML, KYC)
- **Audit Trail**: Immutable record of all security-related activities
- **Risk Assessment**: Evaluate and quantify security risks in blockchain implementations
- **Governance Framework**: Establish and enforce security policies for blockchain operations

### Analytics & Reporting

- **Security Dashboards**: Visualize security metrics and KPIs
- **Incident Response**: Tools for managing and responding to security incidents
- **Forensic Analysis**: Investigate security breaches and unauthorized activities
- **Compliance Reporting**: Generate reports for regulatory compliance

### Developer Tools

- **Secure Development Guidelines**: Best practices for blockchain development
- **Code Analysis**: Static and dynamic analysis tools for smart contracts
- **Testing Framework**: Comprehensive testing tools for blockchain applications
- **Security Plugins**: Integrations with popular development environments

## Architecture

BlockGuardian follows a modular architecture with the following components:

```
BlockGuardian/
├── Core Services
│   ├── Monitoring Engine
│   ├── Analysis Engine
│   ├── Alert System
│   └── Reporting Service
├── Frontend Applications
│   ├── Web Dashboard
│   └── Mobile App
├── Blockchain Connectors
│   ├── Ethereum Connector
│   ├── Bitcoin Connector
│   ├── Solana Connector
│   └── Other Chain Connectors
└── Infrastructure
    ├── Database Cluster
    ├── Message Queue
    ├── Cache Layer
    └── API Gateway
```

## Technology Stack

### Backend

- **Languages**: Python, Rust, Go
- **Frameworks**: FastAPI, Actix, Gin
- **Database**: PostgreSQL, MongoDB, Redis
- **Message Queue**: Kafka, RabbitMQ
- **Blockchain**: Web3.py, ethers.js, Solidity

### Web Frontend

- **Framework**: React with TypeScript
- **State Management**: Redux Toolkit
- **Data Visualization**: D3.js, Recharts
- **Styling**: Tailwind CSS, Styled Components
- **Web3**: ethers.js, web3.js

### Mobile Frontend

- **Framework**: React Native
- **Navigation**: React Navigation
- **State Management**: Redux Toolkit
- **UI Components**: React Native Paper

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Infrastructure as Code**: Terraform, Ansible

## Installation & Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (v16+)
- Python (v3.9+)
- Go (v1.18+)
- Rust (latest stable)

### Setup Using Environment Script

The easiest way to set up the development environment is to use the provided setup script:

```bash
# Clone the repository
git clone https://github.com/quantsingularity/BlockGuardian.git
cd BlockGuardian

# Run the setup script
./setup_blockguardian_env.sh

# Start the application
./run_blockguardian.sh
```

### Manual Setup for Individual Components

1. **Backend (`backend/`):**
   - Navigate to the `backend` directory: `cd backend`
   - Create a virtual environment: `python -m venv venv`
   - Activate the virtual environment: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
   - Install dependencies: `pip install -r requirements.txt`
   - Set up environment variables: `cp .env.example .env` and edit as needed
   - Run the development server: `uvicorn main:app --reload`

2. **Mobile Frontend (`mobile-frontend/`):**
   - Navigate to the `mobile-frontend` directory: `cd mobile-frontend`
   - Install dependencies: `npm install` or `yarn install`
   - Start the development server: `npm start` or `yarn start`
   - Run on Android or iOS:
     ```bash
     yarn android # or npx react-native run-android
     yarn ios   # or npx react-native run-ios
     ```
3. **Web Frontend (`web-frontend/`):**
   - Navigate to the `web-frontend` directory: `cd web-frontend`
   - Install dependencies: `npm install`
   - Run in development mode: `npm run dev` (usually accessible at `http://localhost:3000`)
   - Build for production: `npm run build`
   - Start production server: `npm run start`

### Running the Entire Project (using Docker Compose)

A `docker-compose.yml` file is provided at the root to simplify running the core services (backend, web-frontend). Other services like blockchain nodes or data analysis environments might need separate management or integration into the Docker Compose setup if desired.

```bash
# From the project root directory
docker-compose up --build
```

## Key Scripts

The repository includes several utility scripts to simplify common tasks:

- `setup_blockguardian_env.sh`: Sets up the development environment
- `run_blockguardian.sh`: Starts the application
- `lint-all.sh`: Runs linting on all code
- `validate_code_quality.py`: Validates code quality and security

## Testing

The project maintains comprehensive test coverage across all components to ensure reliability and security.

### Test Coverage

| Component             | Coverage | Status |
| --------------------- | -------- | ------ |
| Backend Services      | 82%      | ✅     |
| Smart Contracts       | 90%      | ✅     |
| Blockchain Connectors | 75%      | ✅     |
| Web Frontend          | 72%      | ✅     |
| Mobile Frontend       | 68%      | ✅     |
| Overall               | 79%      | ✅     |

### Unit Tests

- Backend API endpoint tests
- Smart contract function tests
- Frontend component tests
- Blockchain connector tests

### Integration Tests

- End-to-end workflow tests
- Cross-service integration tests
- API contract tests
- Blockchain interaction tests

### Security Tests

- Smart contract vulnerability scans
- Penetration testing
- Dependency vulnerability scanning
- Access control testing

To run tests:

```bash
# Backend tests
cd backend
pytest

# Smart contract tests
cd blockchain-contracts
npx hardhat test

# Frontend tests
cd web-frontend
npm test
```

## CI/CD Pipeline

BlockGuardian uses GitHub Actions for continuous integration and deployment:

| Stage                | Control Area                    | Institutional-Grade Detail                                                              |
| :------------------- | :------------------------------ | :-------------------------------------------------------------------------------------- |
| **Formatting Check** | Change Triggers                 | Enforced on all `push` and `pull_request` events to `main` and `develop`                |
|                      | Manual Oversight                | On-demand execution via controlled `workflow_dispatch`                                  |
|                      | Source Integrity                | Full repository checkout with complete Git history for auditability                     |
|                      | Python Runtime Standardization  | Python 3.10 with deterministic dependency caching                                       |
|                      | Backend Code Hygiene            | `autoflake` to detect unused imports/variables using non-mutating diff-based validation |
|                      | Backend Style Compliance        | `black --check` to enforce institutional formatting standards                           |
|                      | Non-Intrusive Validation        | Temporary workspace comparison to prevent unauthorized source modification              |
|                      | Node.js Runtime Control         | Node.js 18 with locked dependency installation via `npm ci`                             |
|                      | Web Frontend Formatting Control | Prettier checks for web-facing assets                                                   |
|                      | Mobile Frontend Formatting      | Prettier enforcement for mobile application codebases                                   |
|                      | Documentation Governance        | Repository-wide Markdown formatting enforcement                                         |
|                      | Infrastructure Configuration    | Prettier validation for YAML/YML infrastructure definitions                             |
|                      | Compliance Gate                 | Any formatting deviation fails the pipeline and blocks merge                            |

## Documentation

For detailed documentation, please refer to the following resources:

| Document                    | Path                 | Description                                                 |
| :-------------------------- | :------------------- | :---------------------------------------------------------- |
| **README**                  | `README.md`          | High-level overview, project scope, and quickstart          |
| **API Reference**           | `API.md`             | Detailed documentation for all API endpoints                |
| **CLI Reference**           | `CLI.md`             | Command-line interface usage, commands, and examples        |
| **Installation Guide**      | `INSTALLATION.md`    | Step-by-step installation and environment setup             |
| **User Guide**              | `USAGE.md`           | Comprehensive guide for end-users, workflows, and examples  |
| **Contributing Guidelines** | `CONTRIBUTING.md`    | Contribution process, coding standards, and PR requirements |
| **Architecture Overview**   | `ARCHITECTURE.md`    | System architecture, components, and design rationale       |
| **Configuration Guide**     | `CONFIGURATION.md`   | Configuration options, environment variables, and tuning    |
| **Feature Matrix**          | `FEATURE_MATRIX.md`  | Feature capabilities, coverage, and roadmap alignment       |
| **Troubleshooting**         | `TROUBLESHOOTING.md` | Common issues, diagnostics, and remediation steps           |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
