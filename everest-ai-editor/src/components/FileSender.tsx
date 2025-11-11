import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: #fff;
  margin-bottom: 1rem;
  text-align: center;
`;

const Description = styled.p`
  color: #ccc;
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const UploadArea = styled.div<{ isDragOver: boolean }>`
  border: 2px dashed ${props => props.isDragOver ? '#007bff' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.isDragOver ? 'rgba(0, 123, 255, 0.1)' : 'transparent'};
  margin-bottom: 2rem;
  
  &:hover {
    border-color: #007bff;
    background: rgba(0, 123, 255, 0.05);
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  color: #fff;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
`;

const UploadSubtext = styled.div`
  color: #999;
  font-size: 0.9rem;
`;

const FileInput = styled.input`
  display: none;
`;

const Button = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
  
  &:hover {
    background: linear-gradient(135deg, #0056b3, #004085);
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
  }
`;

const FileList = styled.div`
  margin-top: 1rem;
`;

const FileItemContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const FileIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 12px;
`;

const FileDetails = styled.div`
  color: #fff;
`;

const FileName = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const FileSize = styled.div`
  color: #999;
  font-size: 0.9rem;
`;

const FileStatus = styled.div<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'sending': return 'rgba(255, 193, 7, 0.2)';
      case 'sent': return 'rgba(40, 167, 69, 0.2)';
      case 'error': return 'rgba(220, 53, 69, 0.2)';
      default: return 'rgba(108, 117, 125, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'sending': return '#ffc107';
      case 'sent': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  }};
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 1rem;
  text-align: center;
`;

const SuccessMessage = styled.div`
  color: #51cf66;
  background: rgba(81, 207, 102, 0.1);
  border: 1px solid rgba(81, 207, 102, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 1rem;
  text-align: center;
`;

interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

interface FileSenderProps {
  token: string;
  onFileSent?: (file: any) => void;
}

const FileSender: React.FC<FileSenderProps> = ({ token, onFileSent }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📈';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov': return '🎥';
      case 'mp3':
      case 'wav':
      case 'ogg': return '🎵';
      case 'zip':
      case 'rar':
      case '7z': return '📦';
      case 'txt':
      case 'md': return '📄';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx': return '⚛️';
      case 'html':
      case 'css': return '🌐';
      case 'py': return '🐍';
      case 'java': return '☕';
      case 'cpp':
      case 'c': return '⚙️';
      default: return '📁';
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const sendFile = async (fileItem: FileItem) => {
    setFiles(prev => prev.map(f => 
      f.id === fileItem.id ? { ...f, status: 'sending' } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileItem.file);

      const response = await fetch('/api/files/send-to-telegram', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'sent' } : f
        ));
        
        if (onFileSent) {
          onFileSent(data.fileShare);
        }
      } else {
        throw new Error(data.error || 'Ошибка отправки файла');
      }
    } catch (err) {
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { 
          ...f, 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Неизвестная ошибка'
        } : f
      ));
    }
  };

  const sendAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setError('Нет файлов для отправки');
      return;
    }

    setError('');
    setSuccess('');

    for (const fileItem of pendingFiles) {
      await sendFile(fileItem);
    }

    setSuccess(`Отправлено ${pendingFiles.length} файлов в Telegram`);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setError('');
    setSuccess('');
  };

  return (
    <Container>
      <Title>📤 Отправка файлов в Telegram</Title>
      <Description>
        Перетащите файлы сюда или нажмите для выбора. Файлы будут отправлены в ваш Telegram чат.
      </Description>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <UploadArea
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <UploadIcon>📁</UploadIcon>
        <UploadText>Перетащите файлы сюда или нажмите для выбора</UploadText>
        <UploadSubtext>Максимальный размер файла: 50MB</UploadSubtext>
      </UploadArea>

      <FileInput
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {files.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Button onClick={sendAllFiles}>
              Отправить все файлы
            </Button>
            <Button onClick={clearAll} style={{ background: '#dc3545' }}>
              Очистить все
            </Button>
          </div>

          <FileList>
            {files.map(fileItem => (
              <FileItemContainer key={fileItem.id}>
                <FileInfo>
                  <FileIcon>{getFileIcon(fileItem.file.name)}</FileIcon>
                  <FileDetails>
                    <FileName>{fileItem.file.name}</FileName>
                    <FileSize>{formatFileSize(fileItem.file.size)}</FileSize>
                  </FileDetails>
                </FileInfo>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileStatus status={fileItem.status}>
                    {fileItem.status === 'pending' && 'Ожидает'}
                    {fileItem.status === 'sending' && 'Отправка...'}
                    {fileItem.status === 'sent' && 'Отправлено'}
                    {fileItem.status === 'error' && 'Ошибка'}
                  </FileStatus>
                  {fileItem.status === 'pending' && (
                    <Button 
                      onClick={() => sendFile(fileItem)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Отправить
                    </Button>
                  )}
                  <Button 
                    onClick={() => removeFile(fileItem.id)}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: '#dc3545'
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </FileItemContainer>
            ))}
          </FileList>
        </>
      )}
    </Container>
  );
};

export default FileSender;
