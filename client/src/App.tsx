import { ConfigProvider, theme } from 'antd';
import AppRouter from '@router';

export default function App() {
  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <AppRouter />
    </ConfigProvider>
  );
}
