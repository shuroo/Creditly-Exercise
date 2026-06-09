# Banking Auction Platform

## Overview

This project implements a secure banking auction platform that allows organizations to manage customer accounts, create auction opportunities, receive offers from banks, and track system events.

The system provides role-based access control (RBAC), JWT authentication, MongoDB persistence, event tracking, and integration with an external CRM service (implemented as a mock service).

---

## Assumptions

The following assumptions were made during implementation:

- Each banker belongs to a single bank.
- A bank may submit only one offer per auction.
- Auctions have a fixed expiration date.
- Customer personal information is hidden from bankers.
- RBAC rules are enforced exclusively in the backend.
- CRM integration is simulated through a mock service.

## Main Features

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Secure API endpoints
- Backend-enforced permissions

### Auction Management

Managers can:

- Create auction opportunities
- Open and close auctions
- Manage assigned customer accounts

Banks can:

- View eligible auction opportunities
- Submit offers
- Participate only in active auctions

### Event Tracking

The system records business events such as:

- Account creation
- Auction creation
- Auction status changes
- Offer submissions

### CRM Integration

A mock CRM integration simulates communication with an external customer management system.

The integration is designed to be easily replaceable with a real CRM provider in future versions.

### Frontend

A basic frontend application provides:

- Authentication
- Auction management
- Offer submission
- Account visibility according to permissions

---

## Domain Model

### User

Represents a system user.

### Account

Represents a customer account or business case.

### Event

Represents a tracked business event.

### AuctionOpportunity

Represents an auction opened for banks.

### BankOffer

Represents an offer submitted by a participating bank.

---

## Roles

### Admin

- Full system access

### Manager

- Access only assigned accounts
- Open auctions
- Close auctions

### User

- Create events
- Access only related information

### Banker

- View eligible auction opportunities
- Submit offers
- Cannot access sensitive customer information

---

## Auction Model

The platform implements a **Sealed Auction** model.

### Why Sealed?

The Sealed model was selected because it is the simplest and most suitable approach for a one-time bidding process.

Characteristics:

- Banks submit offers independently.
- Offers are hidden from competing banks.
- No bidding rounds exist.
- Banks cannot modify their offer after submission.
- The winner is determined after auction closure.

This approach reduces implementation complexity while maintaining fairness and confidentiality.

---

## RBAC Rules

The following rules are enforced in the backend:

### Banker Access

A banker can view only auctions that:

- Are currently open
- Match the bank's eligibility criteria

A banker can submit an offer only when:

- The auction is open
- The auction has not expired

A banker cannot access:

- Personal customer data
- Phone numbers
- Email addresses
- Sensitive identifying information

---

## Technology Stack

### Backend

- Node.js
- TypeScript
- Express.js
- MongoDB
- JWT Authentication

### Frontend

- React

### Database

- MongoDB

---

## Architecture Considerations

Key design decisions:

- MongoDB was selected for rapid development and flexible document modeling.
- JWT provides stateless authentication.
- RBAC is enforced in the backend to prevent privilege escalation.
- CRM integration is isolated behind a service layer.
- Sealed auctions provide a simple and secure bidding process.

---

## Running the Project

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

---

## Future Improvements

- Real CRM integration
- Audit logging
- Notifications
- Auction analytics
- Multi-bank eligibility policies
- Containerized deployment

---

## Design Tradeoffs

For the scope of this assignment, simplicity and clarity were prioritized over scalability and advanced workflows.

Examples:
- MongoDB was preferred for rapid development.
- Mock CRM integration was used instead of a real external service.
- Sealed Auction was chosen over multi-round auction models.
- Basic frontend functionality was implemented to demonstrate the business flow.

---

## Author

Shiri Rave