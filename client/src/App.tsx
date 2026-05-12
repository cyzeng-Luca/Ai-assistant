import { useEffect } from 'react';
import { ConfigProvider, Grid, theme } from 'antd';
import AppRouter from '@router';
import { useAppStore } from '@store';

const { useBreakpoint } = Grid;

export default function App() {
  const screens = useBreakpoint();
  const setIsMobile = useAppStore((s) => s.setIsMobile);

  useEffect(() => {
    setIsMobile(!screens.md);
  }, [screens.md, setIsMobile]);

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
