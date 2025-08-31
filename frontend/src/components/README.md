# Components Directory

Frontend components organized by feature for maintainable architecture.

## 📁 Directory Structure

### 🔐 **auth/** - Authentication Components
- `AuthPage.tsx` - Main authentication wrapper
- `Login.tsx` - Login form
- `Register.tsx` - Registration form
- `OTPVerification.tsx` - OTP verification
- `ForgotPassword.tsx` - Password reset
- `ResetPassword.tsx` - Password reset form
- `AuthErrorModal.tsx` - Error modal for auth
- `AuthErrorScreen.tsx` - Full screen error display
- `FullPageSpinner.tsx` - Loading spinner
- `Auth.css` - Authentication styles

### 🗞️ **feed/** - Social Feed Components
- `Feed.tsx` - Main feed container
- `CreatePost.tsx` - Post creation form
- `PostCard.tsx` - Individual post display
- `MediaButtons.tsx` - Media upload controls
- `MediaPreview.tsx` - Media preview component
- `RestFeed.tsx` - REST API feed fallback
- `Feed.css`, `PostCard.css` - Styling

### ✈️ **flights/** - Flight Management
- `AirportAutocomplete.tsx` - Airport search/selection
- `FlightEditModal.tsx` - Flight editing modal
- `FlightManualEntry.tsx` - Manual flight entry
- `CameraFeedback.tsx` - Boarding pass camera feedback
- `TravelStats.tsx` - Travel statistics display
- `FlightEditModal.css` - Modal styling

### 🗺️ **maps/** - Location & Maps
- `LocationPicker.tsx` - Interactive location selection

### 🚨 **notifications/** - Notifications
- Ready for notification components

### 👤 **profile/** - User Profile
- `ProfileHeader.tsx` - Profile header component

### 🎨 **ui/** - Reusable UI Components
- `Avatar.tsx` - User avatar display
- `Button.tsx` - Standardized buttons
- `Icons.tsx` - Icon components

### 📹 **video/** - Media Components
- `VideoPlayer.tsx` - Video playback
- `VideoPlayer.css` - Player styling

### 🏗️ **layout/** - Layout Components
- `MainLayout.tsx` - Main app layout
- `AuthLayout.tsx` - Authentication layout
- `RightSidebar.tsx` - Sidebar component
- `LocationExplorer.tsx` - Location exploration

### 🧭 **navigation/** - Navigation
- `NavigationHeader.tsx` - Main navigation

### 🔧 **common/** - Shared Components
- `ConfirmDialog.tsx` - Confirmation dialogs
- `Toast.tsx` - Toast notifications
- `LocationDisplay.tsx` - Location display
- `ConfirmDialog.css`, `Toast.css` - Styling

### 🧪 **dev/** - Development Tools
- `StressTestPanel.tsx` - Performance testing
- `StressTestPanel.css` - Panel styling

## 🎯 Component Guidelines

### Organization Principles
1. **Feature-first**: Components grouped by business domain
2. **Shared utilities**: Common components in `common/` and `ui/`
3. **Co-location**: Related styles stay with components
4. **Clear naming**: Descriptive, consistent naming

### Import Patterns
```typescript
// Feature components
import { PostCard } from '../feed/PostCard';
import { FlightModal } from '../flights/FlightEditModal';

// Shared components
import { Button } from '../ui/Button';
import { Toast } from '../common/Toast';

// Layout components
import { MainLayout } from '../layout/MainLayout';
```

### File Naming
- **Components**: PascalCase (e.g., `PostCard.tsx`)
- **Styles**: Match component name (e.g., `PostCard.css`)
- **Hooks**: camelCase with 'use' prefix
- **Types**: PascalCase interfaces/types