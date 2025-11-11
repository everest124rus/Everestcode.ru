import React, { useState } from 'react';
import styled from 'styled-components';
import { X, Edit2, Check, X as XIcon } from 'lucide-react';
import { getFileIcon } from '../utils/fileUtils';

interface FileTab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isDirty?: boolean;
}

interface FileTabsProps {
  tabs: FileTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, newName: string) => void;
}

const TabsContainer = styled.div`
  display: flex;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  overflow-x: auto;
  min-height: 40px;
`;

const Tab = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: ${props => props.$isActive ? props.theme.colors.background : props.theme.colors.surface};
  border-right: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.$isActive ? props.theme.colors.background : props.theme.colors.background};
  }

  &:hover .tab-close {
    opacity: 1;
  }
`;

const TabContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

const TabIcon = styled.span`
  font-size: 14px;
  flex-shrink: 0;
`;

const TabName = styled.span<{ $isEditing: boolean }>`
  font-size: 13px;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  display: ${props => props.$isEditing ? 'none' : 'block'};
`;

const TabInput = styled.input`
  font-size: 13px;
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 3px;
  padding: 2px 4px;
  outline: none;
  flex: 1;
  min-width: 0;
`;

const TabActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
`;

const TabCloseButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.danger}20;
    color: ${props => props.theme.colors.danger};
  }
`;

const TabEditButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primary}20;
    color: ${props => props.theme.colors.primary};
  }
`;

const TabConfirmButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${props => props.theme.colors.success};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.success}20;
  }
`;

const TabCancelButton = styled.button`
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: ${props => props.theme.colors.danger};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.danger}20;
  }
`;

const FileTabs: React.FC<FileTabsProps> = ({
  tabs,
  onTabSelect,
  onTabClose,
  onTabRename
}) => {
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditStart = (tabId: string, currentName: string) => {
    setEditingTab(tabId);
    setEditValue(currentName);
  };

  const handleEditConfirm = (tabId: string) => {
    if (editValue.trim() && editValue !== tabs.find(t => t.id === tabId)?.name) {
      onTabRename(tabId, editValue.trim());
    }
    setEditingTab(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingTab(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleEditConfirm(tabId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <TabsContainer>
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          $isActive={tab.isActive}
          onClick={() => !editingTab && onTabSelect(tab.id)}
        >
          <TabContent>
            <TabIcon>{getFileIcon(tab.name)}</TabIcon>

            {editingTab === tab.id ? (
              <TabInput
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, tab.id)}
                onBlur={() => handleEditConfirm(tab.id)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <TabName $isEditing={false}>
                {tab.name}
                {tab.isDirty && ' •'}
              </TabName>
            )}
          </TabContent>

          <TabActions>
            {editingTab === tab.id ? (
              <>
                <TabConfirmButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditConfirm(tab.id);
                  }}
                  title="Подтвердить"
                >
                  <Check size={12} />
                </TabConfirmButton>
                <TabCancelButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCancel();
                  }}
                  title="Отменить"
                >
                  <XIcon size={12} />
                </TabCancelButton>
              </>
            ) : (
              <>
                <TabEditButton
                  className="tab-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditStart(tab.id, tab.name);
                  }}
                  title="Переименовать"
                >
                  <Edit2 size={12} />
                </TabEditButton>
                <TabCloseButton
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  title="Закрыть"
                >
                  <X size={12} />
                </TabCloseButton>
              </>
            )}
          </TabActions>
        </Tab>
      ))}
    </TabsContainer>
  );
};

export default FileTabs;
