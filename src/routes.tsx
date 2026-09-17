import type { RouteObject } from 'react-router';
import { AppShell } from './components/AppShell';
import { RootLayout } from './components/RootLayout';
import { CheckpointPage } from './pages/CheckpointPage';
import { LessonPage } from './pages/LessonPage';
import { MissionPage } from './pages/MissionPage';
import { MissionSummaryPage } from './pages/MissionSummaryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PathPage } from './pages/PathPage';
import { ProfilePage } from './pages/ProfilePage';

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <PathPage /> },
          { path: 'checkpoint', element: <CheckpointPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Lessons and the mission are full screen, without the app shell, so learners can focus.
      { path: 'lesson/:lessonId', element: <LessonPage /> },
      { path: 'mission', element: <MissionPage /> },
      { path: 'mission/summary', element: <MissionSummaryPage /> },
    ],
  },
];
