# NATIONAL SKILL REGISTRY

**Official Government Skill Passport and Credential Verification System**

---

## Executive Summary

The National Skill Registry is a comprehensive, tamper-proof digital credential management and verification platform designed for technical graduates from ITI (Industrial Training Institutes) and Polytechnic institutions across India. The system provides verifiable skill credentials with QR-based verification capabilities, enabling employers to authenticate graduate competencies in seconds without requiring login credentials.

---

## System Overview

### Purpose

This platform serves as a centralized repository and verification mechanism for skill-based credentials issued by accredited technical institutions. It addresses the critical need for verifiable, tamper-resistant proof of vocational competency in the Indian job market.

### Key Features

- **Tamper-Proof Credential Issuance**: Cryptographically secured skill credentials with unique hash identifiers
- **QR-Based Public Verification**: Employers and stakeholders can verify credentials via QR code without authentication
- **Role-Based Access Control**: Distinct dashboards and permissions for ITI Admins, Principals, Trainers, and Students
- **Institutional Isolation**: Multi-tenant architecture ensuring data segregation across institutions
- **Comprehensive Audit Logging**: Complete credential lifecycle tracking for compliance and transparency
- **Reassessment Management**: Structured workflow for skill re-evaluation requests
- **Large-Scale Data Support**: Foundation for 50,000+ student records with 250,000+ credentials

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18.3 with TypeScript, Vite 5.4, Tailwind CSS 3.4 |
| **UI Components** | shadcn/ui (Radix UI) with customized theming |
| **State Management** | React Query (TanStack) 5.83 |
| **Routing** | React Router 6.30 |
| **Backend** | Supabase (PostgreSQL database, Auth, Edge Functions, Storage) |
| **Authentication** | Supabase Auth with JWT token management |
| **Document Generation** | jsPDF 4.2 with AutoTable support |
| **Data Visualization** | Recharts 2.15 for analytics dashboards |
| **QR Code Generation** | qrcode.react 4.2, html5-qrcode 2.3 |
| **Form Management** | React Hook Form 7.61 with Zod validation |
| **Build Tool** | Vite 5.4 with SWC transpilation |

### Database Schema

The system utilizes a normalized PostgreSQL schema with the following primary entities:

#### Core Tables

- **institutions**: Registered ITI and Polytechnic centers with location metadata
- **students**: Student enrollments linked to institutions and optional auth users
- **skills**: Canonical skill taxonomy (15+ core technical competencies)
- **credentials**: Issued skill credentials with cryptographic hash, level (1-4), and status
- **credentials_logs**: Immutable audit trail of all credential state changes

#### Access Control

- **whitelist**: Email-based signup gating with role and institution assignment
- **profiles**: User profile data with role and institution affiliation
- **user_roles**: Security-critical table for role-based access control (RLS)

#### Request Management

- **reassessment_requests**: Student-initiated or staff-managed skill re-evaluation workflow

### Security Model

#### Row-Level Security (RLS)

All tables implement Supabase RLS policies enforcing institutional boundaries:

- **ITI Admins**: Full read/write access across all institutions
- **Principals**: Full read/write access to their assigned institution
- **Trainers**: Read access to students/skills; write access to credentials at their institution
- **Students**: Self-read access to profile and credentials; can request reassessment

#### Authentication Flow

1. User email must be whitelisted with designated role and institution
2. Supabase Auth creates JWT-authenticated user
3. `handle_new_user()` trigger automatically provisions `profiles` and `user_roles` records
4. Role-based routing directs user to appropriate dashboard (`/admin`, `/principal`, `/trainer`, `/student`)

#### Credential Verification

Public verification endpoints require no authentication:
- Verification pages accept credential hash or student ID via URL parameter
- QR codes encode institution + credential hash for secure public lookups
- Public RLS policies allow anonymous access to student and credential metadata

---

## Data Seeding and Demo Environment

### Seed Architecture

The system supports large-scale data seeding via two dedicated Supabase Edge Functions:

#### `seed-dataset` Function
- Streams 50,000-row dataset in batches to avoid timeout/memory limits
- Phases: `status` (row counts), `manifest` (batch metadata), `reset` (data wipe), `refs` (institutions/skills), `students` (1500 rows/batch), `credentials` (2500 rows/batch)
- Seed data stored in private `seed-data` Storage bucket as JSON chunks
- Supports incremental loading via `?phase=students&batch=N` parameters

#### `seed-users` Function
- One-shot provisioning of role-specific demo accounts
- Auto-confirms emails for immediate login capability
- Provides ready-to-use credentials for testing all role workflows

### Demo Account Credentials

| Role | Email | Institution | Password |
|------|-------|-------------|----------|
| ITI Admin | `admin@credify.in` | — | `NATIONAL SKILL REGISTRY@2026` |
| Principal | `principal@credify.in` | ITI Institute 9 | `NATIONAL SKILL REGISTRY@2026` |
| Trainer | `trainer@credify.in` | ITI Institute 9 | `NATIONAL SKILL REGISTRY@2026` |
| Student | `priya.welder@nsr.in` | ITI Institute 9 | `Priya@2026` |

**Note**: Demo accounts are for development and testing only. Credentials should be rotated in production environments.

---

## Installation and Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project (free tier sufficient for development)
- Git version control
- Modern web browser with JavaScript enabled

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the project root:
   ```
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   ```
   ⚠️ **Security Note**: Never commit `.env` files to version control. Use `.env.local` for local development only.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Application will be available at `http://localhost:8080`

5. **Deploy Supabase migrations:**
   ```bash
   supabase db push
   supabase functions deploy seed-dataset
   supabase functions deploy seed-users
   supabase functions deploy skill-summary
   ```

### Production Build

```bash
npm run build
```

Optimized production bundle will be generated in the `dist/` directory.

---

## User Roles and Workflows

### ITI Admin
- **Access Level**: Full system administration
- **Primary Functions**: 
  - Manage institutions and institutional assignments
  - Configure skill taxonomy
  - Manage whitelist and user access
  - View system-wide analytics and audit logs
  - Reset and reseed demonstration data

### Principal
- **Access Level**: Institution-scoped full control
- **Primary Functions**:
  - Oversee trainers and students at assigned institution
  - Issue and revoke credentials
  - Approve reassessment requests
  - Generate institutional reports
  - Monitor trainer activity

### Trainer
- **Access Level**: Institution-scoped limited write
- **Primary Functions**:
  - Issue skill credentials to assessed students
  - Evaluate student competency levels (1-4 scale)
  - Document assessment outcomes
  - View student credentials and progress
  - Process reassessment workflows

### Student
- **Access Level**: Self-service with institutional visibility
- **Primary Functions**:
  - View personal credential portfolio
  - Download credential documents (PDF)
  - Share QR codes for employer verification
  - Request skill reassessment
  - Generate professional skill summaries (AI-powered)

---

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Verify Credential
```
GET /verify?hash=<credential_hash>
GET /verify?student_id=<student_uuid>
```
Returns public credential data, institution, and student information for verification display.

#### QR Code Resolution
QR codes encode institution ID and credential hash, directing to verification page.

### Protected Endpoints (Requires Authentication)

Accessed through Supabase client library with JWT authorization. RLS policies enforce role-based visibility on all operations.

### Edge Functions

#### `seed-dataset`
- **Method**: GET
- **Parameters**: `phase` (status|manifest|reset|refs|students|credentials), `batch` (for students/credentials phases)
- **Authentication**: None (for development; should be restricted in production)
- **Purpose**: Bulk data loading and management

#### `seed-users`
- **Method**: POST
- **Authentication**: None (for development; should be restricted in production)
- **Purpose**: Demo account provisioning

#### `skill-summary`
- **Method**: POST
- **Body**: `{ studentName, trade, skills }`
- **Authentication**: Required
- **Purpose**: Generate AI-powered skill summaries using external LLM API
- **Rate Limiting**: Subject to API provider rate limits and credit availability

---

## Code Structure

```
project-root/
├── src/
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Global styles (Tailwind)
│   ├── components/                 # Reusable React components
│   │   └── ui/                     # shadcn/ui component library
│   ├── pages/                      # Route-based page components
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client initialization
│   │   ├── utils.ts               # Utility functions
│   │   └── types.ts               # TypeScript type definitions
│   └── hooks/                      # Custom React hooks
├── supabase/
│   ├── migrations/                 # Database schema and RLS policies
│   ├── functions/
│   │   ├── seed-dataset/          # Bulk data loading
│   │   ├── seed-users/            # Demo account provisioning
│   │   └── skill-summary/         # AI-powered summaries
│   └── config.toml                # Supabase project configuration
├── public/                         # Static assets
├── .env.local                     # Local environment configuration (gitignored)
├── package.json                   # Node dependencies and scripts
├── vite.config.ts                 # Vite build configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

---

## Development Guidelines

### TypeScript Standards

- Strict mode enabled; minimize use of `any` type
- Define interfaces for all major data structures
- Use discriminated unions for complex state management

### Component Architecture

- Prefer functional components with React Hooks
- Use React Query for server state management
- Implement loading and error states explicitly
- Follow shadcn/ui component patterns for UI consistency

### Database Changes

1. Create new migration file: `supabase/migrations/TIMESTAMP_description.sql`
2. Apply migrations locally: `supabase db push`
3. Test schema changes thoroughly before production deployment
4. Never remove columns or tables without careful planning

### Environment Management

- Development: `.env.local` (gitignored)
- Production: Use Supabase project environment variables
- Never hardcode secrets in source code

---

## Testing

### Unit Testing

```bash
npm run test
```

### Test Watch Mode

```bash
npm run test:watch
```

Test files should be colocated with source files using `.test.ts` or `.spec.ts` naming convention.

---

## Deployment

### Frontend Deployment

The application can be deployed to any static hosting service:

- **Vercel** (recommended): Direct GitHub integration with automatic builds
- **Netlify**: Supports Vite builds natively
- **AWS S3 + CloudFront**: Requires build artifact upload
- **Docker**: Multi-stage build for containerized deployment

### Environment Configuration

Update `VITE_*` variables in hosting platform dashboard. These variables must be accessible at build time.

### Supabase Deployment

1. Ensure all migrations are applied to production database
2. Deploy Edge Functions: `supabase functions deploy --project-id <prod-id>`
3. Update function environment variables if required
4. Test all public endpoints with production credentials

---

## Compliance and Security

### Data Protection

- All user passwords managed by Supabase Auth with bcrypt hashing
- Credentials stored with cryptographic hash identifiers
- Row-level security enforces institutional data isolation
- Audit logs capture all material state changes

### GDPR and Data Privacy

- Student data deletion supported via RLS cascading deletes
- Email-based whitelist controls data access
- Institutional isolation ensures multi-tenancy compliance
- Audit trails support regulatory investigations

### Authentication Security

- JWT tokens with automatic expiration (default: 1 hour)
- Refresh tokens for extended sessions (default: 7 days)
- HTTPS required for all communication
- CORS policies restrict API access to authorized origins

---

## Troubleshooting

### Common Issues

#### Whitelist Error on Signup
- **Cause**: User email not in `public.whitelist` table
- **Resolution**: Verify email is added with appropriate role and institution via Admin panel

#### RLS Policy Blocks Operation
- **Cause**: User lacks required role or institutional affiliation
- **Resolution**: Check `user_roles` table; re-authenticate if needed

#### Edge Function Timeout
- **Cause**: Processing large batches in single request
- **Resolution**: Reduce batch size or split operation into multiple requests

#### QR Code Not Scanning
- **Cause**: Insufficient contrast or damaged QR code
- **Resolution**: Regenerate QR code or increase print resolution

---

## Support and Contribution

### Reporting Issues

Submit issues via GitHub Issues with:
- Detailed reproduction steps
- Expected vs. actual behavior
- Screenshots or error logs when applicable

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/description`
3. Commit changes with clear messages
4. Submit pull request with documentation

### License

[Specify license type if applicable]

---

## Roadmap

### Planned Features

- **Mobile Application**: Native iOS and Android apps for students and trainers
- **Advanced Analytics**: Institutional dashboard with skills demand insights
- **Blockchain Integration**: Immutable credential storage with decentralized verification
- **Multi-Language Support**: Localization for regional language support
- **API Marketplace**: Third-party integration capabilities for employers and platforms

### Performance Optimization

- Database query optimization for large datasets
- Credential caching layer for frequently accessed data
- CDN integration for static asset delivery
- Backend caching for skill summary generation

---

## Contact and Support

**For Technical Support**: support@nsr.gov.in  
**For Administrative Queries**: admin@nsr.gov.in  
**Documentation**: https://docs.nsr.gov.in  

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready
