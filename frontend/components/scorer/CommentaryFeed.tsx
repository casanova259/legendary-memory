import React from 'react';
import { Card } from '../ui/Card';
import { Commentary } from '../../types';

export interface CommentaryFeedProps {
  commentaryList: Commentary[];
}

export const CommentaryFeed: React.FC<CommentaryFeedProps> = ({ commentaryList }) => {
  return (
    <Card variant="white" className="p-4 border-2 border-black space-y-3">
      <div className="flex items-center justify-between pb-2 border-b-2 border-black">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <span>🎙️</span>
          <span>Live Commentary Feed</span>
        </h3>
        <span className="text-[10px] text-gray-400">Automated Match Engine</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {commentaryList.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4 text-center">
            No commentary generated yet. Recorded balls and wickets will appear here in real time.
          </p>
        ) : (
          commentaryList.map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white text-xs space-y-0.5 transition-colors"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-gray-500">
                <span className="font-bold text-brand-dark">
                  {c.period || 'Ball'} • {c.eventType?.toUpperCase() || 'DELIVERY'}
                </span>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
              </div>
              <p className="text-gray-800 font-medium leading-relaxed">{c.message}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
