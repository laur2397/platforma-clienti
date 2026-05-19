import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/session';
import { getDB } from '@/lib/db';
import { Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,WidthType,AlignmentType,VerticalAlign,PageOrientation } from 'docx';
export async function GET(request: Request) {
  const session=await getAdminSession();
  if(!session.userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {searchParams}=new URL(request.url);
  const q=searchParams.get('q')||'';
  const db=getDB();
  let sql='SELECT * FROM dosare';
  const params:unknown[]=[];
  if(q){sql+=' WHERE cui LIKE ? OR denumire_firma LIKE ?';params.push(`%${q}%`,`%${q}%`);}
  sql+=' ORDER BY created_at DESC';
  const rows=db.prepare(sql).all(...params) as Record<string,unknown>[];
  const headers=['CUI','Denumire','Judet','Localitate','Status','Data'];
  const keys=['cui','denumire_firma','judet','localitate','status','created_at'];
  const hr=new TableRow({tableHeader:true,children:headers.map(h=>new TableCell({children:[new Paragraph({children:[new TextRun({text:h,bold:true,color:'FFFFFF',size:20})],alignment:AlignmentType.CENTER})],shading:{fill:'1e3a8a',type:'clear' as const,color:'auto'},verticalAlign:VerticalAlign.CENTER}))});
  const dr=rows.map((row,i)=>new TableRow({children:keys.map(k=>new TableCell({children:[new Paragraph({children:[new TextRun({text:String(row[k]??''),size:18})]})],shading:i%2!==0?{fill:'EFF6FF',type:'clear' as const,color:'auto'}:undefined,verticalAlign:VerticalAlign.CENTER}))}));
  const table=new Table({rows:[hr,...dr],width:{size:100,type:WidthType.PERCENTAGE}});
  const doc=new Document({sections:[{properties:{page:{size:{orientation:PageOrientation.LANDSCAPE}}},children:[new Paragraph({children:[new TextRun({text:'Centralizator Dosare',bold:true,size:32})],alignment:AlignmentType.CENTER}),new Paragraph({children:[]}),table]}]});
  const buffer=await Packer.toBuffer(doc);
  const today=new Date().toISOString().slice(0,10);
  return new NextResponse(buffer,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':`attachment; filename="centralizator-${today}.docx"`}});
}
