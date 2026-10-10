import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Polling (transport every 10 s, news every 2 min) stops while the app
      // is in the background and resumes when it returns.
      refetchIntervalInBackground: false,
    },
  },
});

// React Native has no window focus events; the app's foreground state stands
// in for them, so stale queries refresh when the user comes back to the app.
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
