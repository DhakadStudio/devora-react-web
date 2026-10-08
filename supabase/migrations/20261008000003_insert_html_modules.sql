-- ============================================================================
-- Insert HTML Fundamentals module records
-- ============================================================================
-- This migration inserts the 7 module records for the HTML learning path.

INSERT INTO modules (id, title, summary, position, course_id) VALUES
  ('html-foundations', 'HTML Foundations', 'Understand HTML document structure, basic elements, and text formatting - the absolute basics of creating webpages', 0, 'html-fundamentals/core'),
  ('html-links-navigation', 'Links and Navigation', 'Master URLs, linking between documents, and creating effective navigation structures', 1, 'html-fundamentals/core'),
  ('html-media-embedding', 'Media and Embedding', 'Work with images, audio, video, and external content while optimizing for performance and accessibility', 2, 'html-fundamentals/core'),
  ('html-semantic-structure', 'Semantic HTML and Document Structure', 'Use semantic elements to create meaningful document structures that communicate purpose to browsers and assistive technologies', 3, 'html-fundamentals/core'),
  ('html-forms-interaction', 'Forms and User Interaction', 'Build accessible, functional forms with proper validation and user experience considerations', 4, 'html-fundamentals/core'),
  ('html-metadata-performance', 'Document Metadata and Performance', 'Optimize HTML documents for search engines, performance, and modern web features', 5, 'html-fundamentals/core'),
  ('html-real-world-applications', 'Real-World HTML Applications', 'Apply all learned concepts to build realistic, multi-page website structures and solve authentic web development problems', 6, 'html-fundamentals/core');