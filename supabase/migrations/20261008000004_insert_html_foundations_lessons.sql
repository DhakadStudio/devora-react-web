INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-foundations/what-is-html', 'What is HTML?', 0, 'html-foundations',
   jsonb_build_object(
     'id', 'html-foundations/what-is-html',
     'kind', 'lesson-content',
     'objective', 'Understand what HTML is, how it works in browsers, and the basic concept of web documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'HTML (HyperText Markup Language) is the standard language for creating webpages. It tells browsers how to structure content so it can be displayed correctly.'),
       jsonb_build_object('type', 'explanation', 'body', 'When you load a webpage, your browser reads the HTML file and uses it to build what you see on screen.'),
       jsonb_build_object('type', 'example', 'code', '<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Welcome to my webpage</h1>\n  <p>This is a paragraph of text.</p>\n</body>\n</html>', 'caption', 'A complete minimal HTML5 document', 'language', 'html'),
       jsonb_build_object('type', 'question', 'prompt', 'Which part of an HTML document tells the browser this is an HTML5 document?', 'options', ['<!DOCTYPE html>', '<html>', '<head>', '<body>'], 'answerIndex', 0, 'explanation', 'The doctype declaration at the very beginning tells the browser to expect HTML5'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-foundations/what-is-html/ex-1'),
       jsonb_build_object('type', 'reflection', 'prompt', 'Think about a website you use frequently. What do you think the HTML structure looks like for that site?')
     )
   )
  ),
  ('html-foundations/first-html-document', 'Your First HTML Document', 1, 'html-foundations',
   jsonb_build_object(
     'id', 'html-foundations/first-html-document',
     'kind', 'lesson-content',
     'objective', 'Create a complete HTML5 document with proper boilerplate structure',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Every HTML5 document needs a specific structure to work correctly in browsers.'),
       jsonb_build_object('type', 'explanation', 'body', 'The essential parts are: doctype declaration, html element, head element (for metadata), and body element (for visible content).'),
       jsonb_build_object('type', 'example', 'code', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>My First Webpage</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>', 'caption', 'A complete HTML5 document with proper structure', 'language', 'html'),
       jsonb_build_object('type', 'interactive', 'language', 'html', 'description', 'Try changing the title text and the heading text to see how it affects what appears in the browser tab and on the page.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>[YOUR TITLE HERE]</title>\n</head>\n<body>\n  <h1>[YOUR HEADING HERE]</h1>\n</body>\n</html>'),
       jsonb_build_object('type', 'question', 'prompt', 'Which element contains the content that users actually see on the webpage?', 'options', ['<!DOCTYPE html>', '<html>', '<head>', '<body>'], 'answerIndex', 3, 'explanation', 'The body element contains all visible content'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-foundations/first-html-document/ex-1'),
       jsonb_build_object('type', 'reflection', 'prompt', 'Why do you think having a standard document structure is important for webpages to work correctly across different browsers?')
     )
   )
  ),
  ('html-foundations/text-elements', 'Text Elements', 2, 'html-foundations',
   jsonb_build_object(
     'id', 'html-foundations/text-elements',
     'kind', 'lesson-content',
     'objective', 'Use heading and paragraph elements to structure text content in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Headings (h1-h6) create hierarchical structure for content, with h1 being the most important heading. Paragraphs (p) contain blocks of text.'),
       jsonb_build_object('type', 'explanation', 'body', 'Proper heading structure helps both sighted users visually scan content and screen reader users navigate efficiently.'),
       jsonb_build_object('type', 'example', 'code', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Text Elements Example</title>\n</head>\n<body>\n  <h1>Main Page Heading</h1>\n  <h2>Section Heading</h1>\n  <p>This is a paragraph of text.</p>\n  <p>This is another paragraph.</p>\n</body>\n</html>', 'caption', 'Document with heading hierarchy and paragraphs', 'language', 'html'),
       jsonb_build_object('type', 'interactive', 'language', 'html', 'description', 'Add a h3 heading below the existing content, then add a paragraph under that heading.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Text Elements Practice</title>\n</head>\n<body>\n  <h1>Main Heading</h1>\n  <p>First paragraph.</p>\n  <!-- Add your h3 heading and paragraph here -->\n</body>\n</html>'),
       jsonb_build_object('type', 'question', 'prompt', 'What is the correct order of heading importance from most to least important?', 'options', ['h1, h2, h3, h4, h5, h6', 'h6, h5, h4, h3, h2, h1', 'h3, h1, h2, h4, h5, h6', 'h2, h1, h3, h4, h5, h6'], 'answerIndex', 0, 'explanation', 'h1 is most important, then h2, then h3, etc.'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-foundations/text-elements/ex-1'),
       jsonb_build_object('type', 'reflection', 'prompt', 'How does using proper heading structure help people who use screen readers to navigate webpages?')
     )
   )
  ),
  ('html-foundations/lists', 'Lists and Document Organization', 3, 'html-foundations',
   jsonb_build_object(
     'id', 'html-foundations/lists',
     'kind', 'lesson-content',
     'objective', 'Create ordered, unordered, and definition lists to organize information in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Lists help organize related information. Unordered lists (ul) use bullet points, ordered lists (ol) use numbers, and definition lists (dl) pair terms with definitions.'),
       jsonb_build_object('type', 'example', 'code', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Lists Example</title>\n</head>\n<body>\n  <h1>Grocery List</h1>\n  <ul>\n    <li>Apples</li>\n    <li>Bananas</li>\n    <li>Carrots</li>\n  </ul>\n  \n  <h1>Recipe Steps</h1>\n  <ol>\n    <li>Preheat oven</li>\n    <li>Mix ingredients</li>\n    <li>Bake for 30 minutes</li>\n  </ol>\n  \n  <h1>Web Development Terms</h1>\n  <dl>\n    <dt>HTML</dt>\n    <dd>HyperText Markup Language - structures web content</dd>\n    <dt>CSS</dt>\n    <dd>Cascading Style Sheets - styles web presentation</dd>
    <dt>JS</dt>
    <dd>JavaScript - adds behavior to web pages</dd>
  </dl>
</body>
</html>', 'caption', 'Examples of unordered, ordered, and definition lists', 'language', 'html'),
       jsonb_build_object('type', 'interactive', 'language', 'html', 'description', 'Create an unordered list of your three favorite foods and an ordered list of the steps to brush your teeth.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Lists Practice</title>\n</head>\n<body>\n  <!-- Add your unordered list of favorite foods here -->\n  \n  <!-- Add your ordered list of tooth brushing steps here -->\n</body>\n</html>'),
       jsonb_build_object('type', 'question', 'prompt', 'Which list type should you use when the order of items matters?', 'options', ['Unordered list (ul)', 'Ordered list (ol)', 'Definition list (dl)', 'Either is fine'], 'answerIndex', 1, 'explanation', 'Use ordered lists when order matters (like steps in a recipe), unordered lists when order doesn\\'t matter (like grocery items)'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-foundations/lists/ex-1'),
       jsonb_build_object('type', 'reflection', 'prompt', 'Think of information you need to organize regularly. Which type of list would work best for that information and why?')
     )
   )
  ),
  ('html-foundations/text-formatting', 'Text Formatting', 4, 'html-foundations',
   jsonb_build_object(
     'id', 'html-foundations/text-formatting',
     'kind', 'lesson-content',
     'objective', 'Apply bold, italic, underline, and other text formatting to emphasize content in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'HTML provides ways to emphasize text: bold (strong/b), italic (em/i), underline (u), and more. Use semantic elements (strong, em) when possible for better accessibility.'),
       jsonb_build_object('type', 'explanation', 'body', 'While visual formatting is important, semantic meaning is more crucial - strong indicates importance, em indicates emphasis.'),
       jsonb_build_object('type', 'example', 'code', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Text Formatting Example</title>\n</head>\n<body>\n  <p>This is <strong>important text</strong> and this is <em>emphasized text</em>.</p>\n  <p>You can also use <b>bold</b> and <i>italic</i> for visual formatting when semantic elements aren\\'t appropriate.</p>\n</body>\n</html>', 'caption', 'Examples of semantic and visual text formatting', 'language', 'html'),
       jsonb_build_object('type', 'interactive', 'language', 'html', 'description', 'Take a plain paragraph and add some bold and italic text to emphasize different parts.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Text Formatting Practice</title>\n</head>\n<body>\n  <p>This is a plain paragraph that needs some emphasis added.</p>\n</body>\n</html>'),
       jsonb_build_object('type', 'question', 'prompt', 'When should you use strong/b instead of em/i for text emphasis?', 'options', ['Always use strong/b', 'Always use em/i', 'Use strong/b for importance, em/i for emphasis', 'It doesn\\'t matter which you use'], 'answerIndex', 2, 'explanation', 'Use strong when text is of strong importance, use em when text is stressed for emphasis'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-foundations/text-formatting/ex-1'),
       jsonb_build_object('type', 'reflection', 'prompt', 'Think about text you see emphasized in books or websites. Is it usually indicating importance or emphasis?')
     )
   )
  );