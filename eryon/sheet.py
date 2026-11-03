import sys
from PIL import Image, ImageDraw
ts=sys.argv[1].split(','); cols=int(sys.argv[2]) if len(sys.argv)>2 else 4
w,h=270,480; rows=(len(ts)+cols-1)//cols
o=Image.new('RGB',(cols*w,rows*h),(0,0,0)); d=ImageDraw.Draw(o)
for i,t in enumerate(ts):
    im=Image.open(f'shots/t_{float(t):.2f}.png').convert('RGB').resize((w,h),Image.LANCZOS)
    o.paste(im,((i%cols)*w,(i//cols)*h)); d.text(((i%cols)*w+6,(i//cols)*h+6),t,fill=(255,40,40))
o.save(sys.argv[3] if len(sys.argv)>3 else 'shots/sheet.png')
