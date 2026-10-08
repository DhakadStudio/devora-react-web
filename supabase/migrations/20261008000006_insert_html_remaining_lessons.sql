-- Lesson records for Module 2: Links and Navigation
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-links-navigation/url-basics', 'URL Basics', 0, 'html-links-navigation',
   jsonb_build_object(
     'id', 'html-links-navigation/url-basics',
     'kind', 'lesson-content',
     'objective', 'Understand the basics of URLs and how they work on the web',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A URL (Uniform Resource Locator) is the address of a resource on the web.'),
       jsonb_build_object('type', 'example', 'code', 'https://www.example.com/path/to/page.html', 'caption', 'Example of a URL', 'language', 'text'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-links-navigation/url-basics/ex-1')
     )
   )
  ),
  ('html-links-navigation/creating-links', 'Creating Links', 1, 'html-links-navigation',
   jsonb_build_object(
     'id', 'html-links-navigation/creating-links',
     'kind', 'lesson-content',
     'objective', 'Learn how to create hyperlinks using the anchor element',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The anchor element (<a>) is used to create hyperlinks to other web pages, files, locations in the same page, email addresses, or any other URL.'),
       jsonb_build_object('type', 'example', 'code', '<a href="https://www.example.com">Visit Example.com</a>', 'caption', 'Example of a hyperlink', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-links-navigation/creating-links/ex-1')
     )
   )
  ),
  ('html-links-navigation/nav-structures', 'Navigation Structures', 2, 'html-links-navigation',
   jsonb_build_object(
     'id', 'html-links-navigation/nav-structures',
     'kind', 'lesson-content',
     'objective', 'Learn how to create effective navigation structures for websites',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Effective navigation helps users find what they are looking for quickly and easily.'),
       jsonb_build_object('type', 'example', 'code', '<nav>\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/about">About</a></li>\n    <li><a href="/services">Services</a></li>\n    <li><a href="/contact">Contact</a></li>\n  </ul>\n</nav>', 'caption', 'Example of a navigation menu', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-links-navigation/nav-structures/ex-1')
     )
   )
  );

-- Lesson records for Module 3: Media and Embedding
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-media-embedding/images', 'Working with Images', 0, 'html-media-embedding',
   jsonb_build_object(
     'id', 'html-media-embedding/images',
     'kind', 'lesson-content',
     'objective', 'Learn how to embed images in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Images are embedded in HTML using the <img> element.'),
       jsonb_build_object('type', 'example', 'code', '<img src="image.jpg" alt="Description of image">', 'caption', 'Example of an image element', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-media-embedding/images/ex-1')
     )
   )
  ),
  ('html-media-embedding/audio', 'Working with Audio', 1, 'html-media-embedding',
   jsonb_build_object(
     'id', 'html-media-embedding/audio',
     'kind', 'lesson-content',
     'objective', 'Learn how to embed audio in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Audio is embedded in HTML using the <audio> element.'),
       jsonb_build_object('type', 'example', 'code', '<audio controls>\n  <source src="audio.mp3" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>', 'caption', 'Example of an audio element', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-media-embedding/audio/ex-1')
     )
   )
  ),
  ('html-media-embedding/video', 'Working with Video', 2, 'html-media-embedding',
   jsonb_build_object(
     'id', 'html-media-embedding/video',
     'kind', 'lesson-content',
     'objective', 'Learn how to embed video in HTML documents',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Video is embedded in HTML using the <video> element.'),
       jsonb_build_object('type', 'example', 'code', '<video controls>\n  <source src="video.mp4" type="video/mp4">\n  Your browser does not support the video element.\n</video>', 'caption', 'Example of a video element', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-media-embedding/video/ex-1')
     )
   )
  );

-- Lesson records for Module 4: Semantic HTML and Document Structure
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-semantic-structure/semantic-elements', 'Semantic Elements', 0, 'html-semantic-structure',
   jsonb_build_object(
     'id', 'html-semantic-structure/semantic-elements',
     'kind', 'lesson-content',
     'objective', 'Learn about semantic elements and their importance',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Semantic elements clearly describe their meaning to both the browser and the developer.'),
       jsonb_build_object('type', 'example', 'code', '<article>\n  <h2>Article Title</h2>\n  <p>Article content goes here.</p>\n</article>', 'caption', 'Example of semantic elements', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-semantic-structure/semantic-elements/ex-1')
     )
   )
  ),
  ('html-semantic-structure/document-outline', 'Document Outline', 1, 'html-semantic-structure',
   jsonb_build_object(
     'id', 'html-semantic-structure/document-outline',
     'kind', 'lesson-content',
     'objective', 'Understand how to create a proper document outline using heading elements',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A proper document outline helps users understand the structure and hierarchy of content.'),
       jsonb_build_object('type', 'example', 'code', '<h1>Main Title</h1>\n<h2>Section Title</h2>\n<h3>Subsection Title</h3>', 'caption', 'Example of a document outline', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-semantic-structure/document-outline/ex-1')
     )
   )
  );

-- Lesson records for Module 5: Forms and User Interaction
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-forms-interaction/form-basics', 'Form Basics', 0, 'html-forms-interaction',
   jsonb_build_object(
     'id', 'html-forms-interaction/form-basics',
     'kind', 'lesson-content',
     'objective', 'Learn the basics of creating forms in HTML',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Forms are used to collect user input and are created using the <form> element.'),
       jsonb_build_object('type', 'example', 'code', '<form action="/submit" method="post">\n  <label for="name">Name:</label>\n  <input type="text" id="name" name="name">\n  <button type="submit">Submit</button>\n</form>', 'caption', 'Example of a form', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-forms-interaction/form-basics/ex-1')
     )
   )
  ),
  ('html-forms-interaction/form-elements', 'Form Elements', 1, 'html-forms-interaction',
   jsonb_build_object(
     'id', 'html-forms-interaction/form-elements',
     'kind', 'lesson-content',
     'objective', 'Learn about different form elements and their uses',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'HTML provides various form elements for collecting different types of data.'),
       jsonb_build_object('type', 'example', 'code', '<select>\n  <option value="">--Select an option--</option>\n  <option value="option1">Option 1</option>\n  <option value="option2">Option 2</option>\n</select>', 'caption', 'Example of a dropdown select element', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-forms-interaction/form-elements/ex-1')
     )
   )
  );

-- Lesson records for Module 6: Document Metadata and Performance
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-metadata-performance/meta-tags', 'Meta Tags', 0, 'html-metadata-performance',
   jsonb_build_object(
     'id', 'html-metadata-performance/meta-tags',
     'kind', 'lesson-content',
     'objective', 'Learn about meta tags and their importance for SEO and social sharing',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Meta tags provide metadata about the HTML document that is used by search engines and social media platforms.'),
       jsonb_build_object('type', 'example', 'code', '<meta name="description" content="A description of the page">\n<meta property="og:title" content="The title of the page">', 'caption', 'Example of meta tags', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-metadata-performance/meta-tags/ex-1')
     )
   )
  ),
  ('html-metadata-performance/performance', 'Performance Optimization', 1, 'html-metadata-performance',
   jsonb_build_object(
     'id', 'html-metadata-performance/performance',
     'kind', 'lesson-content',
     'objective', 'Learn how to optimize HTML documents for better performance',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Optimizing HTML documents can improve page load times and user experience.'),
       jsonb_build_object('type', 'example', 'code', '<!-- Minimize HTML by removing unnecessary whitespace and comments -->', 'caption', 'Example of HTML optimization comment', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-metadata-performance/performance/ex-1')
     )
   )
  );

-- Lesson records for Module 7: Real-World HTML Applications
INSERT INTO lessons (id, title, position, module_id, content) VALUES
  ('html-real-world-applications/project-planning', 'Project Planning', 0, 'html-real-world-applications',
   jsonb_build_object(
     'id', 'html-real-world-applications/project-planning',
     'kind', 'lesson-content',
     'objective', 'Learn how to plan a web project from concept to completion',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Planning is a crucial step in any web project that helps define goals, scope, and requirements.'),
       jsonb_build_object('type', 'example', 'code', '<!-- Project planning involves research, wireframing, and defining the site structure -->', 'caption', 'Example of project planning comment', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-real-world-applications/project-planning/ex-1')
     )
   )
  ),
  ('html-real-world-applications/multi-page-sites', 'Multi-Page Sites', 1, 'html-real-world-applications',
   jsonb_build_object(
     'id', 'html-real-world-applications/multi-page-sites',
     'kind', 'lesson-content',
     'objective', 'Learn how to create multi-page website structures',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Multi-page sites consist of multiple HTML pages linked together through navigation.'),
       jsonb_build_object('type', 'example', 'code', '<nav>\n  <ul>\n    <li><a href="index.html">Home</a></li>\n    <li><a href="about.html">About</a></li>\n    <li><a href="contact.html">Contact</a></li>\n  </ul>\n</nav>', 'caption', 'Example of navigation for a multi-page site', 'language', 'html'),
       jsonb_build_object('type', 'exercise', 'exerciseId', 'html-real-world-applications/multi-page-sites/ex-1')
     )
   )
  );