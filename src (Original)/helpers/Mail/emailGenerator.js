// helpers/Mail/emailGenerator.js

export const generateEmailHTML = (contentBlocks) => {
  const blockHTML = contentBlocks.map(block => {
    switch (block.type) {
      case 'text':
        return `<p style="font-size: ${block.settings.fontSize}; color: ${block.settings.color}; text-align: ${block.settings.textAlign}; line-height: ${block.settings.lineHeight};">${block.content}</p>`;
        
      case 'heading':
        return `<${block.settings.level} style="font-size: ${block.settings.fontSize}; color: ${block.settings.color}; text-align: ${block.settings.textAlign}; font-weight: ${block.settings.fontWeight};">${block.content}</${block.settings.level}>`;
        
      case 'button':
        return `<div style="text-align: ${block.settings.textAlign}; margin: 20px 0;"><a href="${block.content.url}" style="background-color: ${block.settings.backgroundColor}; color: ${block.settings.color}; padding: ${block.settings.padding}; border-radius: ${block.settings.borderRadius}; text-decoration: none; display: inline-block;">${block.content.text}</a></div>`;
        
      case 'image':
        const imageHtml = `<img src="${block.content.src}" alt="${block.content.alt}" style="max-width: ${block.content.width}; width: ${block.content.width}; height: auto; border-radius: ${block.settings.borderRadius};" />`;
        const imageContent = block.content.url ? `<a href="${block.content.url}">${imageHtml}</a>` : imageHtml;
        return `<div style="text-align: ${block.content.alignment}; margin: ${block.settings.margin};">${imageContent}</div>`;
        
      case 'divider':
        return `<hr style="border: none; border-top: 1px ${block.content.style} ${block.content.color}; width: ${block.content.width}; margin: ${block.settings.margin};" />`;
        
      case 'spacer':
        return `<div style="height: ${block.content.height}; background-color: ${block.settings.backgroundColor};"></div>`;
        
      case 'social':
        const socialButtons = block.content.platforms
          .filter(platform => platform.enabled && platform.url)
          .map(platform => {
            const socialIcons = {
              facebook: '📘',
              twitter: '🐦', 
              instagram: '📷',
              linkedin: '💼',
              youtube: '📺'
            };
            return `<a href="${platform.url}" style="display: inline-block; margin: 0 ${parseInt(block.settings.spacing)/2}px; text-decoration: none; font-size: ${block.settings.size};">${socialIcons[platform.name] || '🔗'}</a>`;
          }).join('');
        return `<div style="text-align: ${block.settings.alignment}; margin: 20px 0;">${socialButtons}</div>`;
        
      case 'columns':
        return `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; padding-right: ${parseInt(block.settings.gap)/2}px; vertical-align: top;">
                ${block.content.column1 || 'Left column content...'}
              </td>
              <td style="width: 50%; padding-left: ${parseInt(block.settings.gap)/2}px; vertical-align: top;">
                ${block.content.column2 || 'Right column content...'}
              </td>
            </tr>
          </table>
        `;
        
      default:
        return '';
    }
  }).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f8f8;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
          ${blockHTML}
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
            <p>You received this email because you subscribed to our mailing list.</p>
            <p><a href="{UnsubscribeLink}" style="color: #999;">Unsubscribe</a> | <a href="{UpdatePreferencesLink}" style="color: #999;">Update Preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
};