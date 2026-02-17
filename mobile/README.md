# Tripo Mobile App

React Native mobile application for Tripo - Your personalized Saudi Arabia travel companion.

## Features

- 🔐 **Authentication**: Login and registration with JWT tokens
- 👤 **User Profiles**: Manage profile information and preferences
- 🧠 **Smart Profile**: 4-step wizard for personalized recommendations
- 📱 **For You Feed**: Paginated feed of personalized itineraries
- 🗺️ **Itinerary Details**: View complete itinerary information with places
- 🌐 **Internationalization**: Support for English and Arabic
- 📍 **Saudi Cities**: Focus on Riyadh, Jeddah, Dammam, Mecca, and Medina

## Tech Stack

- **Framework**: React Native 0.81 with Expo SDK 54
- **Navigation**: React Navigation v7 (Stack + Bottom Tabs)
- **UI Library**: React Native Paper v5 (Material Design 3)
- **State Management**: React Context API
- **Data Fetching**: TanStack React Query v5
- **Storage**: AsyncStorage
- **API Client**: Axios with interceptors
- **Forms**: React Hook Form + Zod validation
- **i18n**: react-i18next
- **Images**: Expo Image
- **TypeScript**: Full type safety

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your iOS/Android device (for testing)
- Android Studio (for Android development) or Xcode (for iOS development)

## Installation

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** with your API URL:
   ```
   API_URL=http://localhost:3000
   ```

   **Note**: For testing on a physical device, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.100:3000`)

## Running the App

### Start the Expo development server:
```bash
npm start
```

This will open Expo DevTools in your browser.

### Run on specific platforms:

**iOS Simulator** (macOS only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

**Physical Device**:
1. Install Expo Go app from App Store (iOS) or Google Play (Android)
2. Scan the QR code from Expo DevTools

## Project Structure

```
mobile/
├── src/
│   ├── navigation/          # React Navigation setup
│   │   ├── RootNavigator.tsx       # Root with auth check
│   │   ├── AuthNavigator.tsx       # Login/Register stack
│   │   ├── MainNavigator.tsx       # Bottom tabs
│   │   └── types.ts                # Navigation types
│   ├── screens/             # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── SmartProfileScreen.tsx
│   │   └── itinerary/
│   │       └── ItineraryDetailScreen.tsx
│   ├── components/          # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   └── Input.tsx
│   │   ├── feed/
│   │   │   ├── ForYouFeed.tsx
│   │   │   └── ItineraryCard.tsx
│   │   └── profile/
│   │       └── SmartProfileOnboarding.tsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── services/            # API and storage services
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── storage.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── i18n/                # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json
│   │       └── ar.json
│   └── theme/               # App theme
│       └── index.ts
├── App.tsx                  # Root component
├── app.json                 # Expo configuration
├── babel.config.js          # Babel configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
├── .env                     # Environment variables
└── README.md                # This file
```

## Key Features Implementation

### Authentication Flow
- AsyncStorage for token persistence
- Automatic token refresh on app launch
- Protected routes with auth check in RootNavigator
- Logout clears all stored data

### Smart Profile Wizard
- 4-step onboarding process:
  1. Interests selection (multi-select)
  2. Time window (slider) + Budget (radio buttons)
  3. Activity styles (multi-select)
  4. Mood selection (single select)
- Progress bar and step indicators
- Form validation before proceeding

### Feed with Pagination
- FlatList with infinite scroll
- Pull-to-refresh functionality
- Optimized rendering (windowSize, maxToRender)
- Empty state handling
- Loading states

### Navigation Structure
```
RootNavigator
├── AuthNavigator (when logged out)
│   ├── Login
│   └── Register
└── MainNavigator (when logged in)
    ├── HomeTab (Bottom Tab)
    │   ├── HomeMain (Stack)
    │   └── ItineraryDetail (Stack)
    └── ProfileTab (Bottom Tab)
        ├── ProfileMain (Stack)
        └── SmartProfile (Stack)
```

## API Integration

The mobile app connects to the backend API at the URL specified in `.env`:

### Endpoints Used:
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/profile` - Get user profile
- `PATCH /api/v1/profile` - Update profile
- `PATCH /api/v1/profile/smart-profile` - Update smart profile
- `GET /api/v1/itineraries/feed` - Get personalized feed (paginated)
- `GET /api/v1/itineraries/:id` - Get itinerary details

### Authentication:
- JWT tokens stored in AsyncStorage
- Automatically added to request headers via Axios interceptor
- 401 responses trigger logout and redirect to login

## Development Tips

### Debugging
- Use React DevTools: `npm install -g react-devtools`
- Enable remote debugging in Expo DevTools
- Use `console.log` for quick debugging
- Check Expo logs for errors

### Hot Reload
- Fast Refresh is enabled by default
- Shake device or press Cmd+D (iOS) / Cmd+M (Android) for dev menu

### TypeScript
- Run type checking: `npx tsc --noEmit`
- All components and functions are fully typed

### Testing on Device
1. Ensure your computer and device are on the same WiFi network
2. Update API_URL in `.env` to use your computer's IP address
3. Make sure the backend server is accessible from your network

## Troubleshooting

### App won't connect to API
- Check that API_URL in `.env` is correct
- Ensure backend server is running
- For physical devices, use local IP instead of localhost
- Check firewall settings

### Metro bundler issues
```bash
npx expo start -c  # Clear cache
```

### iOS build issues
```bash
cd ios
pod install
cd ..
```

### Android build issues
- Clean build: `cd android && ./gradlew clean && cd ..`
- Check Android Studio settings

## Building for Production

### Android APK
```bash
eas build --platform android --profile preview
```

### iOS Build
```bash
eas build --platform ios --profile preview
```

For detailed build instructions, see [Expo EAS Build documentation](https://docs.expo.dev/build/setup/).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL | `http://localhost:3000` |

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
