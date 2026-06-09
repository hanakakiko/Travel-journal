import { createBrowserRouter } from 'react-router-dom';
import App from '../App';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: null, // 主页面
      },
      {
        path: '/form-config',
        element: null, // 表单配置页面
      },
      {
        path: '/notebook',
        element: null, // 手帐本列表页面
      },
      {
        path: '/notebook/:id',
        element: null, // 手帐本详情页面
      },
      {
        path: '/notebook/:id/page/:pageId',
        element: null, // 手帐本页面详情
      },
      {
        path: '/edit-info',
        element: null, // 信息编辑页面
      },
      {
        path: '/manage-photos',
        element: null, // 照片管理页面
      },
    ],
  },
]);
