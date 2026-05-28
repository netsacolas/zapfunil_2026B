import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const AVATAR_COLORS = [
  '#00A884', '#02BEB2', '#00C6E2', '#009DE2', '#007BFC',
  '#5B6DEE', '#7C6BEE', '#B56AE0', '#D4619E', '#EF5350',
  '#FF7043', '#FF9800', '#FFC107', '#AEEA00', '#66BB6A',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  const str = name || 'U';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name.trim().split(' ').filter(Boolean).map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
};

interface ChatAvatarProps {
  chatId: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  autoFetch?: boolean;
}

export const ChatAvatar = ({ chatId, name, size = 'md', autoFetch = false }: ChatAvatarProps) => {
  const fetchProfilePicture = useAppStore(state => state.fetchProfilePicture);
  const profilePicture = useAppStore(state => state.profilePictures[chatId]);
  const wahaSessionStatus = useAppStore(state => state.wahaSessionStatus);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (autoFetch && wahaSessionStatus === 'CONNECTED' && chatId && (!profilePicture || profilePicture === 'FAILED')) {
      fetchProfilePicture(chatId);
    }
  }, [chatId, wahaSessionStatus, fetchProfilePicture, autoFetch, profilePicture]);

  useEffect(() => {
    setHasError(false);
  }, [profilePicture]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] mr-1.5',
    sm: 'w-8 h-8 text-xs mr-2',
    md: 'w-10 h-10 text-sm mr-3',
    lg: 'w-12 h-12 text-base mr-3',
    xl: 'w-16 h-16 text-lg mr-0'
  };

  // 1. WhatsApp Avatar or custom uploaded image
  if (profilePicture && profilePicture !== 'FAILED' && !hasError) {
    return (
      <img 
        src={profilePicture} 
        alt={name} 
        className={`${sizeClasses[size]} rounded-full flex-shrink-0 object-cover border border-stone-100 shadow-sm`}
        onError={() => setHasError(true)}
      />
    );
  }

  // 2. Official WhatsApp Web-style grey silhouette fallback
  const isGroup = chatId.endsWith('@g.us');
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex-shrink-0 flex items-center justify-center bg-[#e9edef] border border-stone-200/20 shadow-sm`}
    >
      {isGroup ? (
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-[#aebac1]" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.83 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-[#aebac1]" fill="currentColor">
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-10-10-10z" />
        </svg>
      )}
    </div>
  );
};
