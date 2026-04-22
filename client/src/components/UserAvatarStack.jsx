import React from 'react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];
const getColor = (id) => COLORS[id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length];

export const UserAvatarStack = ({ activeUserIds, members }) => {
  if (!activeUserIds.length || !members.length) return null;

  const activeMembers = activeUserIds
    .map(id => members.find(m => m.user.id === id))
    .filter(Boolean);

  return (
    <div className="absolute top-6 right-6 flex items-center -space-x-3 z-10">
      {activeMembers.map((member) => {
        const color = getColor(member.user.id);
        const initial = member.user.name ? member.user.name.charAt(0).toUpperCase() : '?';

        return (
          <div
            key={member.user.id}
            title={member.user.name}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white shadow-md relative group hover:z-20 transition-transform hover:scale-110 cursor-default"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
        );
      })}
    </div>
  );
};
