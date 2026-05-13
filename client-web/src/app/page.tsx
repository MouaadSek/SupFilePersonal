import { redirect } from 'next/navigation';

// Root → redirect to login. Once dashboard is built, add token check here.
export default function Home() {
  redirect('/login');
}
