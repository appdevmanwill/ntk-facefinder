export function generateXMPSidecar(filename: string, peopleNames: string[]): string {
  const dcSubjects = peopleNames.map(name => `        <rdf:li>${name}</rdf:li>`).join('\n');
  const lrHierarchical = peopleNames.map(name => `        <rdf:li>People|${name}</rdf:li>`).join('\n');

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="FaceFinder 1.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:lr="http://ns.adobe.com/lightroom/1.0/">
      <dc:subject>
        <rdf:Bag>
${dcSubjects}
        </rdf:Bag>
      </dc:subject>
      <lr:hierarchicalSubject>
        <rdf:Bag>
${lrHierarchical}
        </rdf:Bag>
      </lr:hierarchicalSubject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
