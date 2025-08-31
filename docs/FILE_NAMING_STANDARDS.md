# File Naming Standards

Consistent file naming conventions for maintainable codebase architecture.

## 📋 General Principles

1. **Consistency**: Use the same pattern across similar file types
2. **Descriptive**: Names should clearly indicate file purpose
3. **No spaces**: Use camelCase, PascalCase, or kebab-case
4. **Avoid special characters**: Stick to alphanumeric and standard separators

## 📁 Directory Naming

```
✅ Good:
- components/
- services/
- utils/
- scripts/seed/
- tests/integration/

❌ Avoid:
- Components/
- Services & Utils/
- scripts_old/
- tests-old/
```

**Rule**: Use lowercase with descriptive words

## 📄 File Naming by Type

### React Components (.tsx)
```
✅ PascalCase:
- AuthPage.tsx
- PostCard.tsx
- LocationPicker.tsx
- NavigationHeader.tsx

❌ Avoid:
- authPage.tsx
- post-card.tsx
- location_picker.tsx
```

### TypeScript Files (.ts)
```
✅ camelCase for utilities:
- authService.ts
- apiConfig.ts
- apolloClient.ts
- dateStrict.ts

✅ PascalCase for models/types:
- User.ts
- Post.ts
- Flight.ts
```

### Configuration Files
```
✅ Kebab-case traditional:
- vite.config.ts
- tailwind.config.js
- jest.config.js
- package.json

✅ camelCase for project configs:
- apiConfig.ts
- apolloClient.ts
```

### CSS/Style Files
```
✅ Match component names:
- AuthPage.css (for AuthPage.tsx)
- PostCard.css (for PostCard.tsx)

✅ Descriptive for global:
- index.css
- globals.css
```

### Test Files
```
✅ Descriptive with .test:
- authService.test.ts
- PostCard.test.tsx
- userFlow.e2e.test.ts

❌ Avoid hyphens:
- auth-service.test.ts
- post-card.test.tsx
```

### Scripts
```
✅ camelCase for TypeScript:
- seedDatabase.ts
- migrateUsers.ts
- validateData.ts

✅ Kebab-case for shell:
- deploy.sh
- setup-env.sh
- run-tests.sh
```

### Type Definitions (.d.ts)
```
✅ camelCase matching library:
- pdfParse.d.ts
- expressSession.d.ts
- reactTypes.d.ts
```

## 🗂️ Directory Structure Examples

### Frontend Components
```
src/components/
├── auth/
│   ├── AuthPage.tsx
│   ├── LoginForm.tsx
│   └── Auth.css
├── feed/
│   ├── PostCard.tsx
│   ├── CreatePost.tsx
│   └── Feed.css
└── common/
    ├── Button.tsx
    ├── Modal.tsx
    └── Common.css
```

### Backend Services
```
src/
├── controllers/
│   ├── authController.ts
│   ├── postController.ts
│   └── userController.ts
├── services/
│   ├── authService.ts
│   ├── emailService.ts
│   └── storageService.ts
├── models/
│   ├── User.ts
│   ├── Post.ts
│   └── Flight.ts
└── utils/
    ├── dateHelper.ts
    ├── validator.ts
    └── logger.ts
```

### Scripts Organization
```
scripts/
├── seed/
│   ├── seedDatabase.ts
│   ├── createTestUsers.ts
│   └── socialFeedData.ts
├── migration/
│   ├── migrateImages.ts
│   └── updateSchema.ts
├── deployment/
│   ├── deploy.sh
│   └── rollback.sh
└── testing/
    ├── stressTest.js
    └── loadTest.js
```

## 🔧 Migration Completed

### Recent Standardizations
- ✅ `apollo-client.ts` → `apolloClient.ts`
- ✅ `api.config.ts` → `apiConfig.ts`
- ✅ `error-handler.ts` → `errorHandler.ts`
- ✅ `pdf-parse.d.ts` → `pdfParse.d.ts`
- ✅ Scripts organized by feature directories
- ✅ Components organized by business domain

### Legacy Exceptions
Some files maintain legacy naming for external compatibility:
- `package.json`, `tsconfig.json` (standard format)
- `.env`, `.gitignore` (dotfile convention)
- `jest.config.js`, `vite.config.ts` (tool convention)

## ✅ Validation

To check naming compliance:
```bash
# Find non-standard component names
find src/components -name "*.tsx" | grep -E "(^[a-z]|[-_])"

# Find non-standard service names  
find src/services -name "*.ts" | grep -E "([-_]|^[A-Z])"

# Find non-standard test names
find . -name "*.test.*" | grep -E "[-_]"
```