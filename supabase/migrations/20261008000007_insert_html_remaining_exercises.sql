-- Exercise records for Module 2: Links and Navigation
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-links-navigation/url-basics/ex-1', 'Identify URL components', 0, 'html-links-navigation/url-basics',
   jsonb_build_object(
     'id', 'html-links-navigation/url-basics/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'multiple-choice',
     'objective', 'Identify the different parts of a URL',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A URL consists of several parts: protocol, domain, path, and optionally query parameters and fragments.'),
       jsonb_build_object('type', 'multiple-choice', 'prompt', 'Which part of the URL "https://www.example.com/path/to/page.html?query=value#section" is the domain?', 'options', ['https://', 'www.example.com', '/path/to/page.html', '?query=value'], 'answerIndex', 1, 'explanation', 'The domain is "www.example.com" which identifies the website being accessed.')
     )
   )
  ),
  ('html-links-navigation/creating-links/ex-1', 'Create a hyperlink', 0, 'html-links-navigation/creating-links',
   jsonb_build_object(
     'id', 'html-links-navigation/creating-links/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a hyperlink to a specified URL',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'To create a hyperlink, use the <a> element with the href attribute specifying the target URL.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a hyperlink that says "Visit our website" and points to "https://www.example.com".', 'starterCode', '<!-- Add your hyperlink here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_LINK_TO_EXAMPLE_COM', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'LINK_TEXT', 'value', 'Visit our website')
       )
     )
   )
  ),
  ('html-links-navigation/nav-structures/ex-1', 'Create a navigation menu', 0, 'html-links-navigation/nav-structures',
   jsonb_build_object(
     'id', 'html-links-navigation/nav-structures/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a simple navigation menu with links to different pages',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A navigation menu typically contains links to the main sections of a website.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a navigation menu with links to Home, About, Services, and Contact pages.', 'starterCode', '<!-- Add your navigation menu here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_NAV_ELEMENT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_FOUR_LINKS', 'value', true)
       )
     )
   )
  );

-- Exercise records for Module 3: Media and Embedding
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-media-embedding/images/ex-1', 'Add an image to a webpage', 0, 'html-media-embedding/images',
   jsonb_build_object(
     'id', 'html-media-embedding/images/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Add an image to a webpage with appropriate alternative text',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The <img> element requires a src attribute for the image URL and an alt attribute for alternative text.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Add an image with the URL "https://example.com/photo.jpg" and alternative text "A beautiful landscape".', 'starterCode', '<!-- Add your image element here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_IMG_WITH_CORRECT_SRC', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_ALT_TEXT', 'value', true)
       )
     )
   )
  ),
  ('html-media-embedding/audio/ex-1', 'Embed audio controls', 0, 'html-media-embedding/audio',
   jsonb_build_object(
     'id', 'html-media-embedding/audio/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Embed an audio player with controls',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The <audio> element is used to embed audio content. Adding the controls attribute displays the default audio player controls.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Embed an audio player that plays "audio.mp3" and shows controls for play, pause, and volume.', 'starterCode', '<!-- Add your audio element here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_AUDIO_ELEMENT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_CONTROLS_ATTRIBUTE', 'value', true)
       )
     )
   )
  ),
  ('html-media-embedding/video/ex-1', 'Embed video controls', 0, 'html-media-embedding/video',
   jsonb_build_object(
     'id', 'html-media-embedding/video/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Embed a video player with controls',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The <video> element is used to embed video content. Adding the controls attribute displays the default video player controls.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Embed a video player that plays "video.mp4" and shows controls for play, pause, and volume.', 'starterCode', '<!-- Add your video element here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_VIDEO_ELEMENT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_CONTROLS_ATTRIBUTE', 'value', true)
       )
     )
   )
  );

-- Exercise records for Module 4: Semantic HTML and Document Structure
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-semantic-structure/semantic-elements/ex-1', 'Identify semantic elements', 0, 'html-semantic-structure/semantic-elements',
   jsonb_build_object(
     'id', 'html-semantic-structure/semantic-elements/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'multiple-choice',
     'objective', 'Identify which elements are semantic elements',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Semantic elements clearly describe their meaning to both the browser and the developer. Examples include <article>, <section>, <nav>, <header>, <footer>, <aside>, <figure>, and <figcaption>.'),
       jsonb_build_object('type', 'multiple-choice', 'prompt', 'Which of the following elements is a semantic element?', 'options', ['<div>', '<span>', '<article>', '<container>'], 'answerIndex', 2, 'explanation', 'The <article> element is a semantic element that represents a self-contained composition in a document.')
     )
   )
  ),
  ('html-semantic-structure/document-outline/ex-1', 'Create a document outline', 0, 'html-semantic-structure/document-outline',
   jsonb_build_object(
     'id', 'html-semantic-structure/document-outline/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a proper document outline using heading elements',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A proper document outline uses heading elements (h1-h6) to show the hierarchy of content.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a document outline with the following structure: Main Title (h1), Section Title (h2), Subsection Title (h3).', 'starterCode', '<!-- Add your heading elements here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_H1_H2_H3_IN_ORDER', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HEADING_TEXT_CORRECT', 'value', true)
       )
     )
   )
  );

-- Exercise records for Module 5: Forms and User Interaction
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-forms-interaction/form-basics/ex-1', 'Create a basic form', 0, 'html-forms-interaction/form-basics',
   jsonb_build_object(
     'id', 'html-forms-interaction/form-basics/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a basic form with a text input and submit button',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'A basic form includes a <form> element, form controls like <input>, and a submit button.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a form that collects a user\'s name with a text input field and a submit button.', 'starterCode', '<form action="/submit" method="post">\n  <!-- Add your form elements here -->\n</form>', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_FORM_ELEMENT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_TEXT_INPUT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_SUBMIT_BUTTON', 'value', true)
       )
     )
   )
  ),
  ('html-forms-interaction/form-elements/ex-1', 'Create a dropdown select', 0, 'html-forms-interaction/form-elements',
   jsonb_build_object(
     'id', 'html-forms-interaction/form-elements/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a dropdown select element with options',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The <select> element creates a dropdown list, and <option> elements define the available choices.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a dropdown select element with the options: "Select a fruit", "Apple", "Banana", "Orange".', 'starterCode', '<select>\n  <!-- Add your options here -->\n</select>', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_SELECT_ELEMENT', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_FOUR_OPTIONS', 'value', true)
       )
     )
   )
  );

-- Exercise records for Module 6: Document Metadata and Performance
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-metadata-performance/meta-tags/ex-1', 'Add meta tags for SEO', 0, 'html-metadata-performance/meta-tags',
   jsonb_build_object(
     'id', 'html-metadata-performance/meta-tags/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Add meta tags for search engine optimization',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Meta tags like description and keywords help search engines understand the content of a page.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Add a meta description tag with the content "Learn web development with HTML tutorials".', 'starterCode', '<!-- Add your meta tag here -->', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_META_DESCRIPTION', 'value', true)
       )
     )
   )
  ),
  ('html-metadata-performance/performance/ex-1', 'Optimize HTML performance', 0, 'html-metadata-performance/performance',
   jsonb_build_object(
     'id', 'html-metadata-performance/performance/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Identify ways to optimize HTML for better performance',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Optimizing HTML includes minimizing file size, reducing the number of requests, and leveraging browser caching.'),
       jsonb_build_object('type', 'multiple-choice', 'prompt', 'Which of the following is a good practice for optimizing HTML performance?', 'options', ['Increase the number of external CSS files', 'Use inline CSS for all styles', 'Minimize HTML by removing unnecessary whitespace and comments', 'Use large, uncompressed images'], 'answerIndex', 2, 'explanation', 'Minimizing HTML by removing unnecessary whitespace and comments reduces file size and improves load times.')
       )
     )
   )
  );

-- Exercise records for Module 7: Real-World HTML Applications
INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-real-world-applications/project-planning/ex-1', 'Identify project planning steps', 0, 'html-real-world-applications/project-planning',
   jsonb_build_object(
     'id', 'html-real-world-applications/project-planning/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'multiple-choice',
     'objective', 'Identify the key steps in planning a web project',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Key steps in web project planning include defining goals, researching the target audience, creating a site map, and planning the content.'),
       jsonb_build_object('type', 'multiple-choice', 'prompt', 'Which of the following is typically the first step in planning a web project?', 'options', ['Creating wireframes', 'Writing content', 'Defining project goals and scope', 'Choosing color schemes'], 'answerIndex', 2, 'explanation', 'Defining project goals and scope is typically the first step in planning a web project.')
     )
   )
  ),
  ('html-real-world-applications/multi-page-sites/ex-1', 'Create links between pages', 0, 'html-real-world-applications/multi-page-sites',
   jsonb_build_object(
     'id', 'html-real-world-applications/multi-page-sites/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create hyperlinks that navigate between different pages in a website',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'In a multi-page site, hyperlinks in the navigation menu allow users to move between different HTML pages.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a navigation menu with links that will work in a multi-page site with pages named "index.html", "about.html", and "contact.html".', 'starterCode', '<nav>\n  <ul>\n    <!-- Add your navigation links here -->\n  </ul>\n</nav>', 'tests', jsonb_build_array(
         jsonb_build_object('type', 'assertion', 'condition', 'HAS_NAV_WITH_THREE_LINKS', 'value', true),
         jsonb_build_object('type', 'assertion', 'condition', 'LINKS_POINT_TO_CORRECT_PAGES', 'value', true)
       )
     )
   )
  );