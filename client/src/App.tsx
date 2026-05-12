import { ConfigProvider, theme } from 'antd';
import AppRouter from '@router';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: '#4a6ee8',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBorder: 'rgba(0, 0, 0, 0.1)',
          colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
          colorText: '#000000',
          colorTextSecondary: '#666666',
          colorTextTertiary: '#999999',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  );
}
