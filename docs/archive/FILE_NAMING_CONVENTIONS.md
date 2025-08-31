# File Naming Conventions

## Current Standards

### 1. **Components** (React/Flutter)
- **Format**: PascalCase
- **Extension**: `.tsx` for React, `.dart` for Flutter
- **Examples**: 
  - `AuthPage.tsx`
  - `PostCard.tsx`
  - `NavigationHeader.tsx`

### 2. **Services**
- **Format**: camelCase with `.service` suffix
- **Extension**: `.ts`
- **Examples**:
  - `auth.service.ts`
  - `post.service.ts`
  - `socket.service.ts`

### 3. **Utilities/Helpers**
- **Format**: camelCase
- **Extension**: `.ts`
- **Examples**:
  - `dateStrict.ts`
  - `fetchWithTimeout.ts`
  - `debounce.ts`

### 4. **Hooks** (React)
- **Format**: camelCase with `use` prefix
- **Extension**: `.ts` or `.tsx`
- **Examples**:
  - `useAuth.ts`
  - `useOptimisticLikes.ts`
  - `useFileUpload.ts`

### 5. **Contexts** (React)
- **Format**: PascalCase with `Context` suffix
- **Extension**: `.tsx`
- **Examples**:
  - `AuthContext.tsx`
  - `ToastContext.tsx`
  - `SocketContext.tsx`

### 6. **Types/Interfaces**
- **Format**: camelCase with `.types` suffix
- **Extension**: `.ts`
- **Location**: In `types/` directory or colocated with feature
- **Examples**:
  - `user.types.ts`
  - `post.types.ts`
  - `flight.types.ts`

### 7. **Tests**
- **Format**: Same as source file with `.test` suffix
- **Extension**: `.ts` or `.tsx`
- **Examples**:
  - `auth.service.test.ts`
  - `PostCard.test.tsx`
  - `generateOtp.test.ts`

### 8. **Styles**
- **Format**: Same as component name
- **Extension**: `.css` or `.module.css`
- **Examples**:
  - `Auth.css`
  - `Feed.css`
  - `PostCard.module.css` (for CSS modules)

### 9. **Configuration Files**
- **Format**: lowercase with hyphens
- **Extension**: Various (`.json`, `.js`, `.ts`)
- **Examples**:
  - `jest.config.js`
  - `vite.config.ts`
  - `docker-compose.yml`

### 10. **Scripts**
- **Format**: lowercase with hyphens
- **Extension**: `.sh`, `.js`, or `.ts`
- **Examples**:
  - `test-runner.sh`
  - `seed-data.ts`
  - `migrate-database.js`

## Directory Structure

```
src/
├── components/       # React components (PascalCase)
├── services/        # API services (camelCase.service.ts)
├── hooks/          # Custom hooks (useXxx.ts)
├── contexts/       # React contexts (XxxContext.tsx)
├── utils/          # Utilities (camelCase.ts)
├── types/          # TypeScript types (camelCase.types.ts)
├── assets/         # Static assets
└── tests/          # Test files (*.test.ts)
```

## Migration Needed

The following files need renaming to match conventions:

### Services (should be camelCase.service.ts):
- ✅ All services already follow convention

### Components (should be PascalCase.tsx):
- ✅ All components already follow convention

### Utils (should be camelCase.ts):
- ✅ All utilities already follow convention

## Best Practices

1. **Be Consistent**: Follow the same pattern throughout the codebase
2. **Be Descriptive**: File names should clearly indicate their purpose
3. **Avoid Abbreviations**: Use full words (e.g., `Authentication` not `Auth` in file names)
4. **Colocate Related Files**: Keep related files together (component + styles + tests)
5. **Use Index Files Sparingly**: Only for public APIs of modules

## Examples of Good Naming

```
✅ components/auth/LoginForm.tsx
✅ services/user.service.ts
✅ hooks/useDebounce.ts
✅ utils/formatDate.ts
✅ types/api.types.ts

❌ components/auth/login-form.tsx
❌ services/UserService.ts
❌ hooks/debounce.ts
❌ utils/FormatDate.ts
❌ types/ApiTypes.ts
```