/**
 * Extract Gutenberg block comments and remove HTML markup
 * @param {string} html - HTML string with Gutenberg block comments
 * @return {string} - Cleaned block comments
 */
function extractBlockComments(html) {
  // Match all Gutenberg block comments (opening and closing)
  const blockCommentsRegex = /<!-- wp:.*?-->|<!-- \/wp:.*?-->/g;
  const matches = html.match(blockCommentsRegex);

  if (!matches) {
    throw new Error("No Gutenberg blocks found in the input.");
  }

  // Join all matched comments into a single string
  return matches.join("\n");
}

function parseBlockComments(comments) {
  const blockStartRegex = /<!-- wp:([^\s]+)(?:\s+({.*}))?\s+-->/g;
  const blocks = [];
  let match;

  while ((match = blockStartRegex.exec(comments)) !== null) {
    const blockName = match[1];
    const blockAttributes = match[2] ? JSON.parse(match[2]) : {};
    const startPosition = match.index;

    // Find the matching closing tag for this specific block
    const endTag = `<!-- /wp:${blockName} -->`;
    let nestingLevel = 1; // Start with 1 because we found an opening tag
    let searchPosition = blockStartRegex.lastIndex;
    let endPosition = -1;

    while (nestingLevel > 0) {
      const nextOpeningTag = comments.indexOf(`<!-- wp:${blockName}`, searchPosition);
      const nextClosingTag = comments.indexOf(endTag, searchPosition);

      if (nextClosingTag === -1) {
        throw new Error(`Missing closing tag for block: ${blockName}`);
      }

      if (nextOpeningTag !== -1 && nextOpeningTag < nextClosingTag) {
        // Found another opening tag before the closing tag
        nestingLevel++;
        searchPosition = nextOpeningTag + 1;
      } else {
        // Found a closing tag
        nestingLevel--;
        searchPosition = nextClosingTag + endTag.length;

        if (nestingLevel === 0) {
          endPosition = nextClosingTag;
        }
      }
    }

    // Extract the block content between the opening and closing tags
    const blockContent = comments.substring(blockStartRegex.lastIndex, endPosition).trim();

    // Create the block object
    const block = [
      blockName.includes("/") ? blockName : `core/${blockName}`,
      blockAttributes,
    ];

    // If there's content, parse inner blocks recursively
    if (blockContent) {
      const innerBlocks = parseBlockComments(blockContent);
      block.push( innerBlocks );
    }

    // If there's no content, set innerBlocks to null
    if (!blockContent) {
      block.push([]);
    }

    // Add this block to the list of blocks
    blocks.push(block);

    // Move the regex index to after the closing tag
    blockStartRegex.lastIndex = endPosition + endTag.length;
  }

  return blocks;
}

/**
 * Format the template array into a readable JavaScript code string
 * @param {Array} template - The template array
 * @return {string} - Formatted JavaScript code
 */
function formatTemplate(template) {
  // First, stringify the template with indentation
  let jsonString = JSON.stringify(template, null, 2);

  // Replace null with [] for empty innerBlocks
  jsonString = jsonString.replace(/: null/g, ": []");

  // Only remove quotes from property keys in objects, not from block names in arrays
  // This regex looks for property keys (followed by :) and removes their quotes
  jsonString = jsonString.replace(/"([^"]+)":/g, "$1:");

  // Preserve quoted strings in arrays (the block names)
  return jsonString;
}

/**
 * Process Gutenberg HTML and generate InnerBlocks template
 * @param {string} html - Gutenberg HTML with comments
 * @return {string} - JavaScript code for InnerBlocks template
 */
function generateInnerBlocksTemplate(html) {
  try {
    // Step 1: Extract Gutenberg block comments
    const comments = extractBlockComments(html);

    // Step 2: Parse the block comments into a template
    const blocks = parseBlockComments(comments);

    // Step 3: Format the template into readable JavaScript code
    const formattedTemplate = formatTemplate(blocks);

    return `// InnerBlocks Template
const TEMPLATE = ${formattedTemplate};

// Usage example:
// <InnerBlocks
//   template={TEMPLATE}
//   templateLock="all"
// />`;
  } catch (error) {
    return `Error generating template: ${error.message}`;
  }
}

// Set up the event listener for the convert button
document.getElementById("convert").addEventListener("click", function () {
  const input = document.getElementById("input").value;
  if (!input) {
    alert("Please paste Gutenberg HTML first.");
    return;
  }

  const output = generateInnerBlocksTemplate(input);
  document.getElementById("output").value = output;
});
