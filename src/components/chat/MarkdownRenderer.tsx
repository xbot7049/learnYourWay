
import React from 'react';
import { MessageSegment, Citation } from '@/types/message';
import CitationButton from './CitationButton';
import { parseTextForCitations, hasUuidCitations } from '@/lib/citationParser';

interface MarkdownRendererProps {
  content: string | { segments: MessageSegment[]; citations: Citation[] };
  className?: string;
  onCitationClick?: (citation: Citation) => void;
  isUserMessage?: boolean;
  notebookId?: string;
  sourceMetadata?: Map<string, { title: string; type: string; content: string; summary: string; url: string }> | null;
}

const MarkdownRenderer = ({ content, className = '', onCitationClick, isUserMessage = false, notebookId, sourceMetadata }: MarkdownRendererProps) => {
  // Handle enhanced content with citations
  if (typeof content === 'object' && 'segments' in content) {
    return (
      <div className={className}>
        {processMarkdownWithCitations(content.segments, content.citations, onCitationClick, isUserMessage, sourceMetadata)}
      </div>
    );
  }

  // For string content, check if it contains UUID citations
  const stringContent = typeof content === 'string' ? content : '';

  if (hasUuidCitations(stringContent) && onCitationClick && sourceMetadata) {
    const parsed = parseTextForCitations(stringContent);
    const uuidCitations: Citation[] = parsed.citations.map(c => {
      const source = sourceMetadata.get(c.uuid);
      return {
        citation_id: c.citationNumber,
        source_id: c.uuid,
        source_title: source?.title || 'Unknown Source',
        source_type: source?.type || 'text',
        chunk_index: c.citationNumber - 1
      };
    });

    const segments: MessageSegment[] = parsed.segments.map(seg => ({
      text: seg.text,
      citation_id: seg.citationNumber
    }));

    return (
      <div className={className}>
        {processMarkdownWithUuidCitations(segments, uuidCitations, onCitationClick, isUserMessage, sourceMetadata)}
      </div>
    );
  }

  // For legacy string content without UUID citations, convert to simple format
  const segments: MessageSegment[] = [{ text: stringContent }];
  const citations: Citation[] = [];

  return (
    <div className={className}>
      {processMarkdownWithCitations(segments, citations, onCitationClick, isUserMessage, sourceMetadata)}
    </div>
  );
};

// Function to process markdown with UUID-based citations
const processMarkdownWithUuidCitations = (
  segments: MessageSegment[],
  citations: Citation[],
  onCitationClick: (citation: Citation) => void,
  isUserMessage: boolean,
  sourceMetadata: Map<string, { title: string; type: string; content: string; summary: string; url: string }> | null | undefined
) => {
  if (isUserMessage) {
    return (
      <span>
        {segments.map((segment, index) => {
          const citation = segment.citation_id ? citations.find(c => c.citation_id === segment.citation_id) : undefined;
          return (
            <span key={index}>
              {processInlineMarkdown(segment.text)}
              {citation && (
                <button
                  onClick={() => onCitationClick(citation)}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer ml-0.5"
                >
                  {segment.text}
                </button>
              )}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div>
      {segments.map((segment, index) => {
        const citation = segment.citation_id ? citations.find(c => c.citation_id === segment.citation_id) : undefined;

        if (citation) {
          return (
            <span key={index}>
              {processTextWithMarkdown(segment.text.replace(/\[\d+\]/, ''))}
              <button
                onClick={() => onCitationClick(citation)}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer ml-1 text-sm"
                title={`View source: ${citation.source_title}`}
              >
                [{citation.citation_id}]
              </button>
            </span>
          );
        }

        return (
          <span key={index}>
            {processTextWithMarkdown(segment.text)}
          </span>
        );
      })}
    </div>
  );
};

// Function to process markdown with citations inline
const processMarkdownWithCitations = (
  segments: MessageSegment[],
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void,
  isUserMessage: boolean = false,
  sourceMetadata?: Map<string, { title: string; type: string; content: string; summary: string; url: string }> | null
) => {
  // For user messages, render as inline content without paragraph breaks
  if (isUserMessage) {
    return (
      <span>
        {segments.map((segment, index) => (
          <span key={index}>
            {processInlineMarkdown(segment.text)}
            {segment.citation_id && onCitationClick && (
              <CitationButton
                chunkIndex={(() => {
                  const citation = citations.find(c => c.citation_id === segment.citation_id);
                  return citation?.chunk_index || 0;
                })()}
                onClick={() => {
                  const citation = citations.find(c => c.citation_id === segment.citation_id);
                  if (citation) {
                    onCitationClick(citation);
                  }
                }}
              />
            )}
          </span>
        ))}
      </span>
    );
  }

  // For AI messages, treat each segment as a potential paragraph
  const paragraphs: JSX.Element[] = [];
  
  segments.forEach((segment, segmentIndex) => {
    const citation = segment.citation_id ? citations.find(c => c.citation_id === segment.citation_id) : undefined;
    
    // Split segment text by double line breaks to handle multiple paragraphs within a segment
    const paragraphTexts = segment.text.split('\n\n').filter(text => text.trim());
    
    paragraphTexts.forEach((paragraphText, paragraphIndex) => {
      // Process the paragraph text for markdown formatting
      const processedContent = processTextWithMarkdown(paragraphText.trim());
      
      paragraphs.push(
        <p key={`${segmentIndex}-${paragraphIndex}`} className="mb-4 leading-relaxed">
          {processedContent}
          {/* Add citation at the end of the paragraph if this is the last paragraph of the segment */}
          {paragraphIndex === paragraphTexts.length - 1 && citation && onCitationClick && (
            <CitationButton
              chunkIndex={citation.chunk_index || 0}
              onClick={() => onCitationClick(citation)}
            />
          )}
        </p>
      );
    });
  });
  
  return paragraphs;
};

// Helper function to process text with markdown formatting (bold, line breaks)
const processTextWithMarkdown = (text: string) => {
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*|__.*?__)/g);
    
    const processedLine = parts.map((part, partIndex) => {
      if (part.match(/^\*\*(.*)\*\*$/)) {
        const boldText = part.replace(/^\*\*(.*)\*\*$/, '$1');
        return <strong key={partIndex}>{boldText}</strong>;
      } else if (part.match(/^__(.*__)$/)) {
        const boldText = part.replace(/^__(.*__)$/, '$1');
        return <strong key={partIndex}>{boldText}</strong>;
      } else {
        return part;
      }
    });

    return (
      <span key={lineIndex}>
        {processedLine}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

// Function to process markdown inline without creating paragraph breaks
const processInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
  
  return parts.map((part, partIndex) => {
    if (part.match(/^\*\*(.*)\*\*$/)) {
      const boldText = part.replace(/^\*\*(.*)\*\*$/, '$1');
      return <strong key={partIndex}>{boldText}</strong>;
    } else if (part.match(/^__(.*__)$/)) {
      const boldText = part.replace(/^__(.*__)$/, '$1');
      return <strong key={partIndex}>{boldText}</strong>;
    } else {
      // Replace line breaks with spaces for inline rendering
      return part.replace(/\n/g, ' ');
    }
  });
};

export default MarkdownRenderer;
