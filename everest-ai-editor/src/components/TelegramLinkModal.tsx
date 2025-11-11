import React, { useState } from 'react';
import { X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface TelegramLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const TelegramLinkModal: React.FC<TelegramLinkModalProps> = ({
  isOpen,
  onClose,
  username
}) => {
  const telegramLink = `https://t.me/Everest_AI_Codebot?start=link_${username}`;

  if (!isOpen) return null;

  return (
    <div 
      className="glass-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className="glass-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: `
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `
        }}
      >
        {/* Header */}
        <div 
          className="glass-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <h3 
              className="glass-modal-title"
              style={{
                color: '#ffffff',
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.5px'
              }}
            >
              Свяжите аккаунт с Telegram
            </h3>
          </div>
          <button
            className="glass-modal-close"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ color: '#ffffff', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '24px', fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
            Для отправки файлов в Telegram необходимо связать аккаунт.
          </p>

          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h4 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '16px', 
              fontWeight: 600,
              color: '#ffffff'
            }}>
              Инструкция:
            </h4>
            <ol style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px'
            }}>
              <li style={{ marginBottom: '8px' }}>
                Откройте бота <strong>@Everest_AI_Codebot</strong> в Telegram
              </li>
              <li style={{ marginBottom: '8px' }}>
                Отправьте команду: <code style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>/link {username}</code>
              </li>
              <li>
                После этого попробуйте отправить файлы снова
              </li>
            </ol>
          </div>

          {/* QR Code Section */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center'
            }}>
              <strong>📱 Или отсканируйте QR-код:</strong>
            </p>
            <div 
              style={{
                padding: '16px',
                background: 'white',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '232px',
                height: '232px'
              }}
            >
              <QRCodeCanvas
                value={telegramLink}
                size={200}
                level="H"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#ffffff"
                style={{ display: 'block' }}
              />
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center'
            }}>
              Откройте Telegram и отсканируйте код
              <br />
              Бот автоматически свяжет ваш аккаунт!
            </p>
          </div>
        </div>

        {/* Button */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              letterSpacing: '0.3px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramLinkModal;

