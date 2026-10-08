INSERT INTO exercises (id, title, position, lesson_id, content) VALUES
  ('html-foundations/what-is-html/ex-1', 'Identify the DOCTYPE declaration', 0, 'html-foundations/what-is-html',
   jsonb_build_object(
     'id', 'html-foundations/what-is-html/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'multiple-choice',
     'objective', 'Identify the correct DOCTYPE declaration for HTML5',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'The DOCTYPE declaration tells the browser which version of HTML the page is using. For HTML5, it should be <!DOCTYPE html>.'),
       jsonb_build_object('type', 'multiple-choice', 'prompt', 'Which of the following is the correct DOCTYPE declaration for HTML5?', 'options', ['<!DOCTYPE html>', '<!DOCTYPE HTML5>', '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 5.0//EN">', '<html>'], 'answerIndex', 0, 'explanation', 'The correct DOCTYPE for HTML5 is simply <!DOCTYPE html>.')
     )
   )
  ),
  ('html-foundations/first-html-document/ex-1', 'Create a basic HTML5 document', 0, 'html-foundations/first-html-document',
   jsonb_build_object(
     'id', 'html-foundations/first-html-document/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a complete HTML5 document with proper structure',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Create a complete HTML5 document with the following structure: <!DOCTYPE html>, <html>, <head> with <meta charset="utf-8"> and <title>, and <body> with content.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a complete HTML5 document that displays "Hello, World!" as a heading.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <!-- Add meta charset and title here -->\n</head>\n<body>\n  <!-- Add your heading here -->\n</body>\n</html>', 'tests', jsonb_build_array(
        jsonb_build_object('type', 'assertion', 'condition', 'DOCTYPE', 'value', '<!DOCTYPE html>'),
        jsonb_build_object('type', 'assertion', 'condition', 'TITLE', 'value', 'Hello, World!'),
        jsonb_build_object('type', 'assertion', 'condition', 'BODY_CONTENT', 'value', '<h1>Hello, World!</h1>')
      )
     )
   )
  ),
  ('html-foundations/text-elements/ex-1', 'Create heading hierarchy', 0, 'html-foundations/text-elements',
   jsonb_build_object(
     'id', 'html-foundations/text-elements/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create a document with proper heading hierarchy (h1, h2, h3)',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Create a document with an h1 heading, an h2 heading below it, and an h3 heading below the h2.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create a document with the following headings: "Main Title" (h1), "Section Title" (h2), and "Subsection Title" (h3).', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Heading Practice</title>\n</head>\n<body>\n  <!-- Add your headings here -->\n</body>\n</html>', 'tests', jsonb_build_array(
        jsonb_build_object('type', 'assertion', 'condition', 'HEADING_ORDER', 'value', ['h1', 'h2', 'h3']),
        jsonb_build_object('type', 'assertion', 'condition', 'HEADING_TEXT', 'value', ['Main Title', 'Section Title', 'Subsection Title'])
      )
     )
   )
  ),
  ('html-foundations/lists/ex-1', 'Create unordered and ordered lists', 0, 'html-foundations/lists',
   jsonb_build_object(
     'id', 'html-foundations/lists/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Create an unordered list of items and an ordered list of steps',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Create an unordered list (bullet points) for grocery items and an ordered list (numbered) for recipe steps.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Create an unordered list of your three favorite fruits and an ordered list of the steps to make a peanut butter and jelly sandwich.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Lists Practice</title>\n</head>\n<body>\n  <!-- Add your unordered list of fruits here -->\n  \n  <!-- Add your ordered list of sandwich steps here -->\n</body>\n</html>', 'tests', jsonb_build_array(
        jsonb_build_object('type', 'assertion', 'condition', 'HAS_UNORDERED_LIST', 'value', true),
        jsonb_build_object('type', 'assertion', 'condition', 'HAS_ORDERED_LIST', 'value', true),
        jsonb_build_object('type', 'assertion', 'condition', 'LIST_ITEM_COUNT', 'value', 3)
      )
     )
   )
  ),
  ('html-foundations/text-formatting/ex-1', 'Apply text formatting', 0, 'html-foundations/text-formatting',
   jsonb_build_object(
     'id', 'html-foundations/text-formatting/ex-1',
     'kind', 'exercise-content',
     'exerciseType', 'free-code',
     'objective', 'Apply bold and italic formatting to text in a paragraph',
     'blocks', jsonb_build_array(
       jsonb_build_object('type', 'explanation', 'body', 'Apply bold formatting to important text and italic formatting to emphasized text in a paragraph.'),
       jsonb_build_object('type', 'free-code', 'prompt', 'Take the plain paragraph below and make the word "important" bold and the word "emphasized" italic.', 'starterCode', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Text Formatting Practice</title>\n</head>\n<body>\n  <p>This is a plain paragraph with some important and emphasized text.</p>\n</body>\n</html>', 'tests', jsonb_build_array(
        jsonb_build_object('type', 'assertion', 'condition', 'HAS_BOLD_TEXT', 'value', true),
        jsonb_build_object('type', 'assertion', 'condition', 'HAS_ITALIC_TEXT', 'value', true),
        jsonb_build_object('type', 'assertion', 'condition', 'HAS_PLAIN_TEXT', 'value', true)
      )
     )
   )
  );