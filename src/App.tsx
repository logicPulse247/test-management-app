import { RouterProvider } from 'react-router-dom';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { router } from '@/routes/AppRoutes';

function App() {
  return (
    <>
      <GlobalLoader />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
