# 🛡️ Decentralized Pharmacovigilance Database

Welcome to a revolutionary platform for real-time global monitoring of drug side effects! This Web3 project leverages the Stacks blockchain and Clarity smart contracts to create a transparent, immutable, and decentralized database for pharmacovigilance. It addresses the real-world problem of fragmented, delayed, and opaque reporting of adverse drug reactions (ADRs), which can lead to public health risks, regulatory inefficiencies, and lack of trust in pharmaceutical data. By enabling patients, doctors, researchers, and regulators to report, verify, and query side effects in real-time, this system promotes faster detection of safety issues, global collaboration, and data-driven decision-making without relying on centralized authorities.

## ✨ Features

🔒 Secure and anonymous reporting of side effects with cryptographic proofs  
🌐 Real-time global access to aggregated data for monitoring trends  
📊 Immutable records to prevent tampering and ensure auditability  
✅ Multi-level verification by stakeholders (e.g., doctors, regulators)  
⚠️ Automated alerts for emerging patterns or high-risk signals  
🏆 Incentive mechanisms via utility tokens for accurate reporting  
🔍 Advanced querying for researchers and public health analysts  
🚫 Governance for community-driven updates to protocols  

## 🛠 How It Works

This project consists of 8 interconnected Clarity smart contracts on the Stacks blockchain, designed to handle different aspects of the pharmacovigilance lifecycle. Together, they form a robust, scalable system that ensures data integrity while solving issues like under-reporting and siloed information in traditional systems.

### Smart Contracts Overview

1. **UserRegistry.clar**: Manages user registration and roles (e.g., patients, doctors, regulators). Stores hashed identities for privacy and assigns permissions.  
2. **DrugRegistry.clar**: Maintains a registry of drugs with unique IDs, names, manufacturers, and metadata. Prevents duplicates and allows updates via governance.  
3. **ReportSubmission.clar**: Handles submission of ADR reports, including patient details (anonymized), drug ID, side effect description, severity, and timestamp. Emits events for real-time monitoring.  
4. **VerificationEngine.clar**: Allows authorized users (e.g., doctors) to verify reports. Uses multi-signature logic for consensus on report validity.  
5. **DataAggregator.clar**: Aggregates verified reports for analytics, computing stats like frequency, severity scores, and geographic trends on-chain.  
6. **AlertSystem.clar**: Triggers notifications for thresholds (e.g., sudden spike in reports). Integrates with off-chain oracles for external alerts.  
7. **GovernanceDAO.clar**: Enables token holders to vote on protocol changes, such as adding new drug categories or adjusting verification rules.  
8. **IncentiveToken.clar**: A fungible token contract that rewards users for submitting and verifying accurate reports, discouraging spam through staking mechanisms.

**For Patients/Reporters**  
- Register anonymously via UserRegistry.  
- Submit a side effect report using ReportSubmission, providing a hash of evidence (e.g., medical records) for privacy.  
- Earn tokens from IncentiveToken upon verification.  

Boom! Your report is now part of the global database, contributing to public safety.

**For Doctors/Verifiers**  
- Register with credentials in UserRegistry.  
- Use VerificationEngine to review and confirm reports.  
- Query DataAggregator for trends in specific drugs or regions.  

Instant verification and insights at your fingertips!

**For Researchers/Regulators**  
- Access aggregated data via DataAggregator for queries like "side effects of Drug X in the last 30 days."  
- Monitor alerts from AlertSystem for emerging risks.  
- Participate in GovernanceDAO to propose improvements.  

All data is immutable and verifiable on the blockchain, fostering trust and rapid response to health threats.