import React from 'react';

export const AIOverlay = ({ analysis, onClose }) => {
  if (!analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease forwards' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-xl">🧠</div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Architecture Analysis</h2>
              <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Claude Sonnet 3.5 Vision</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-white/50 hover:bg-white rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {analysis.error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium">
              {analysis.error}
            </div>
          ) : (
            <>
              {/* Score & Summary */}
              <div className="flex items-start gap-6 mb-8">
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter">{analysis.scalabilityScore}<span className="text-xl text-gray-400">/10</span></span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Score</span>
                </div>
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Executive Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Key Recommendations
                </h3>
                
                <div className="space-y-4">
                  {analysis.suggestions?.map((sug, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        sug.severity === 'high' ? 'bg-red-500' : 
                        sug.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 pr-4">{sug.title}</h4>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          sug.severity === 'high' ? 'bg-red-50 text-red-600' : 
                          sug.severity === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {sug.severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{sug.description}</p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-start gap-2">
                        <span className="text-indigo-500 mt-0.5">💡</span>
                        <p className="text-sm font-medium text-gray-800">{sug.recommendation}</p>
                      </div>
                    </div>
                  ))}

                  {(!analysis.suggestions || analysis.suggestions.length === 0) && (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 text-gray-500">
                      Architecture looks solid. No major suggestions right now.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
