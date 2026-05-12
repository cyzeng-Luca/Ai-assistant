import { Input, Button } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="p-4"
      style={{
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        className="rounded-2xl border border-border-default"
        style={{ background: '#ffffff', width: '752px' }}
      >
        <Input.TextArea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          disabled={disabled}
          className="text-base chat-textarea"
          style={{
            border: 'none',
            boxShadow: 'none',
            padding: '12px 16px 8px',
            background: 'transparent',
            fontSize: 16,
          }}
        />
        <div className="flex justify-end px-3 pb-3">
          {isStreaming ? (
            <Button
              icon={<StopOutlined />}
              onClick={onStop}
              danger
              style={{ height: 32, width: 32, borderRadius: 16 }}
              className="flex items-center justify-center"
            />
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className="chat-send-btn flex items-center justify-center"
              style={{ height: 32, width: 32, borderRadius: 16 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
