import { Redirect } from 'expo-router';
import { useAppSelector } from '../src/store/hooks';

// The entry gate: a rehydrated access token (from expo-secure-store, F14) → the tab shell; otherwise
// the Welcome / sign-in screen.
export default function Index() {
  const token = useAppSelector((s) => s.auth.accessToken);
  return <Redirect href={token ? '/(tabs)/collection' : '/sign-in'} />;
}
