const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const html = `
<table>
  <thead>
    <tr>
      <th><p>Feature</p></th>
      <th><p>Array</p></th>
      <th><p>Singly Linked List</p></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><p>Random access</p></td>
      <td><p>O(1)</p></td>
      <td><p>O(n)</p></td>
    </tr>
  </tbody>
</table>
`;

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
});

turndownService.use(gfm);

turndownService.addRule('table-cell-p', {
    filter: function (node, options) {
        return (
            node.nodeName === 'P' &&
            node.parentNode &&
            (node.parentNode.nodeName === 'TD' || node.parentNode.nodeName === 'TH')
        );
    },
    replacement: function (content) {
        return content;
    }
});

console.log(turndownService.turndown(html));
