import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Alert, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useAppStore } from '@store';
import * as api from '@services/api';

export default function LoginPage() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { loading, run: doLogin } = useRequest(api.login, {
    manual: true,
    onBefore: () => {
      setError(null);
    },
    onSuccess: (loggedIn) => {
      setUser(loggedIn);
      void navigate('/', { replace: true });
    },
    onError: (err: Error) => {
      setError(err.message || '登录失败');
    },
  });

  if (user) return <Navigate to="/" replace />;

  const handleLogin = () => {
    if (!username.trim()) return;
    doLogin(username.trim());
  };

  return (
    <div className="h-dvh flex justify-center items-center relative overflow-hidden">
      <Card
        className="w-[90vw] max-w-[420px] glass-raised animate-scale-in !border-border-default"
        styles={{ body: { padding: '28px 24px' } }}
        title={
          <span className="text-gradient text-lg font-semibold tracking-tight">
            SaaS 模块查询助手
          </span>
        }
      >
        <Space direction="vertical" className="w-full" size="middle">
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              closable
              onClose={() => {
                setError(null);
              }}
            />
          )}
          <Typography.Text className="!text-text-secondary text-sm">
            输入您的用户名以开始使用
          </Typography.Text>
          <Input
            placeholder="输入用户名"
            prefix={<UserOutlined />}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
            onPressEnter={handleLogin}
            autoFocus
          />
          <Button
            type="primary"
            block
            onClick={handleLogin}
            loading={loading}
            size="large"
            className="!h-11 !rounded-lg !font-semibold"
          >
            登录
          </Button>
        </Space>
      </Card>
    </div>
  );
}
