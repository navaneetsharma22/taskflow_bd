# Shared Cross-Cutting Services Layer

## Folder Responsibility
The `src/services/` directory is reserved for **shared, cross-cutting infrastructure services** that operate across multiple business domains. 

Do not put domain-specific business logic here (domain-specific logic belongs inside `src/modules/<module-name>/service.js`).

## Examples of Services Placed Here:
*   **`mailService.js`**: Deals with generating, formatting, and executing SMTP emails (SendGrid, NodeMailer).
*   **`cacheService.js`**: Integrates Redis cache structures to store global settings or speed up high-frequency reads.
*   **`storageService.js`**: Interfaces with cloud assets providers (AWS S3, Cloudinary) to upload attachments and avatars.
*   **`aiService.js`**: Integrates LLM/DeepMind Gemini SDKs for deadline predictors, sprint summaries, and workload analysis.
