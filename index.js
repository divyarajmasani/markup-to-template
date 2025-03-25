/**
 * Parse Gutenberg block HTML and extract block information
 * @param {string} html - HTML string with Gutenberg block comments
 * @return {Array} - Array of block templates for InnerBlocks
 */
function parseGutenbergBlocks(html) {
  // Regular expression to match Gutenberg block comments and their content
  const blockRegex =
    /<!-- wp:([^\s]+)(?:\s+({.*}))?\s+-->([\s\S]*?)<!-- \/wp:\1 -->/g;
  const blocks = [];
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const blockName = match[1];
    const blockAttributes = match[2] ? JSON.parse(match[2]) : {};
    const blockContent = match[3].trim();

    // Check if this block has inner blocks
    const innerBlocks = [];
    if (blockContent) {
      // Create a temporary div to hold the content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = blockContent;

      // Count comment nodes that match block openings
      const innerBlockComments = blockContent.match(/<!-- wp:[^\s]+/g);

      if (innerBlockComments && innerBlockComments.length > 0) {
        // Recursively parse inner blocks
        const parsedInnerBlocks = parseGutenbergBlocks(blockContent);
        innerBlocks.push(...parsedInnerBlocks);
      }
    }

    // Format the block name - handle namespaced blocks correctly
    let formattedBlockName = blockName;

    // If the block name starts with 'wp:' but doesn't contain a namespace (no slash)
    if (blockName.startsWith("wp:") && !blockName.includes("/")) {
      formattedBlockName = `core/${blockName.substring(3)}`;
    }
    // If the block name starts with 'wp:' and has a namespace (contains slash)
    else if (blockName.startsWith("wp:")) {
      formattedBlockName = blockName.substring(3);
    }

    // Add this block to the template
    blocks.push([
      formattedBlockName,
      blockAttributes,
      innerBlocks.length > 0 ? innerBlocks : [],
    ]);
  }

  return blocks;
}

/**
 * Format the template array into a readable JavaScript code string
 * @param {Array} template - The template array
 * @return {string} - Formatted JavaScript code
 */
function formatTemplate(template) {
  return (
    JSON.stringify(template, null, 2)
      // Replace null with [] for empty innerBlocks
      .replace(/: null/g, ": []")
      // Make it more readable as JavaScript code
      .replace(/"([^"]+)":/g, "$1:")
  );
}

/**
 * Process Gutenberg HTML and generate InnerBlocks template
 * @param {string} html - Gutenberg HTML with comments
 * @return {string} - JavaScript code for InnerBlocks template
 */
function generateInnerBlocksTemplate(html) {
  try {
    const blocks = parseGutenbergBlocks(html);
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

// Example Gutenberg HTML for the textarea placeholder
const exampleHtml = `<!-- wp:columns {"className":"my-columns"} -->
                      <div class="wp-block-columns my-columns">
                          <!-- wp:column -->
                          <div class="wp-block-column">
                              <!-- wp:heading {"level":2} -->
                              <h2>Column 1 Heading</h2>
                              <!-- /wp:heading -->

                              <!-- wp:paragraph -->
                              <p>This is some paragraph text in the first column.</p>
                              <!-- /wp:paragraph -->
                          </div>
                          <!-- /wp:column -->

                          <!-- wp:column -->
                          <div class="wp-block-column">
                              <!-- wp:image {"id":123,"sizeSlug":"large"} -->
                              <figure class="wp-block-image size-large">
                                  <img src="example.jpg" alt="Example" class="wp-image-123"/>
                              </figure>
                              <!-- /wp:image -->
                          </div>
                          <!-- /wp:column -->
                      </div>
                      <!-- /wp:columns -->`;

// Set up the event listener for the convert button
document.getElementById("input").placeholder = exampleHtml;
document.getElementById("convert").addEventListener("click", function () {
  const input = document.getElementById("input").value;
  if (!input) {
    alert("Please paste Gutenberg HTML first.");
    return;
  }

  const output = generateInnerBlocksTemplate(input);
  document.getElementById("output").value = output;
});
