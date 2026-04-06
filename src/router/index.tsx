import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const FundList = lazy(() => import('../pages/Funds/FundList'))
const FundDetail = lazy(() => import('../pages/Funds/FundDetail'))
const ClientList = lazy(() => import('../pages/Clients/ClientList'))
const ClientDetail = lazy(() => import('../pages/Clients/ClientDetail'))
const FollowUpList = lazy(() => import('../pages/FollowUps/FollowUpList'))
const AgentPage = lazy(() => import('../pages/Agent/AgentPage'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'funds', element: <FundList /> },
      { path: 'funds/:id', element: <FundDetail /> },
      { path: 'clients', element: <ClientList /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'followups', element: <FollowUpList /> },
      { path: 'agent', element: <AgentPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
