import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Overview from './pages/Overview'
import DataGrid from './pages/DataGrid'
import Backup from './pages/Backup'
import Settings from './pages/Settings'
import Shopping from './pages/Shopping'
import Chores from './pages/Chores'
import Subscriptions from './pages/Subscriptions'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Overview />
      },
      {
        path: '/datagrid',
        element: <DataGrid />
      },
      {
        path: '/backup',
        element: <Backup />
      },
      {
        path: '/settings',
        element: <Settings />
      },
      {
        path: '/shopping',
        element: <Shopping />
      },
      {
        path: '/subscriptions',
        element: <Subscriptions />
      },
      {
        path: '/chores',
        element: <Chores />
      }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
