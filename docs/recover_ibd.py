"""
从 MySQL 8.0 .ibd 文件提取 InnoDB 记录
用法: python docs/recover_ibd.py <student|course|sc|all>
"""
import struct
import sys
import os

PAGE_SIZE = 16384
PAGE_TYPE_INDEX = 17855
PAGE_HEADER_OFFSET = 38
PAGE_HEADER_SIZE = 56

TABLES = {
    'student': {
        'file': r'D:\mysql-ibd-backup\stu\student.ibd',
        'columns': [
            ('Sno', 'char(8)'), ('Sname', 'varchar(20)'), ('Ssex', 'char(6)'),
            ('Sage', 'int'), ('Smajor', 'varchar(40)'), ('S_entrance', 'date'),
            ('武魂', 'varchar(10)')
        ]
    },
    'course': {
        'file': r'D:\mysql-ibd-backup\stu\course.ibd',
        'columns': [
            ('Cno', 'char(5)'), ('Cname', 'varchar(40)'), ('Ccredit', 'smallint'),
            ('Cpno', 'char(5)')
        ]
    },
    'sc': {
        'file': r'D:\mysql-ibd-backup\stu\sc.ibd',
        'columns': [
            ('Sno', 'char(8)'), ('Cno', 'char(5)'), ('Grade', 'smallint'),
            ('Semester', 'char(5)'), ('Teachingclass', 'char(8)')
        ]
    }
}

def read_ibd(path):
    if not os.path.exists(path):
        print(f"文件不存在: {path}", file=sys.stderr)
        return []
    with open(path, 'rb') as f:
        data = f.read()
    pages = []
    for i in range(0, len(data), PAGE_SIZE):
        page = data[i:i+PAGE_SIZE]
        if len(page) == PAGE_SIZE:
            pages.append(page)
    return pages

def get_page_type(page):
    return struct.unpack('>H', page[24:26])[0]

def get_page_header(page):
    off = PAGE_HEADER_OFFSET
    n_recs = struct.unpack('>H', page[off+20:off+22])[0]
    heap_top = struct.unpack('>H', page[off+6:off+8])[0]
    n_heap = struct.unpack('>H', page[off+8:off+10])[0]
    level = struct.unpack('>H', page[off+30:off+32])[0]
    return {'n_recs': n_recs, 'heap_top': heap_top, 'level': level}

def try_extract_student(page, page_no):
    """从 student 表的 INDEX 页面中提取记录"""
    ph = get_page_header(page)
    if ph['n_recs'] == 0 or ph['level'] != 0:
        return []

    records = []
    heap_top = ph['heap_top']

    if heap_top < 100 or heap_top > PAGE_SIZE - 100:
        return []

    # infimum 在偏移 94 (38 + 56) 处, 前 2 字节是 next record 偏移
    pos = 94
    while True:
        if pos + 2 > len(page):
            break
        next_off = struct.unpack('>H', page[pos:pos+2])[0]
        if next_off == 0 or next_off >= PAGE_SIZE:
            break

        # 检查是否是 record (跳过 infimum = heap_no 0 和 supremum = heap_no 1)
        if pos + 7 > len(page):
            break
        info_byte = page[pos+2]
        heap_no = struct.unpack('>H', page[pos+3:pos+5])[0] & 0x7FFF

        if heap_no <= 1:
            pos = next_off
            continue

        # 读取记录数据
        # student: Sno char(8), Sname varchar(20), Ssex char(6), Sage int(4),
        #          Smajor varchar(40), S_entrance date(3), 武魂 varchar(10)
        # compact format:
        #   2(next_off) + 5(header) + null_bitmap(1) = 8 bytes header

        data_start = pos + 8
        offset = data_start

        try:
            # Sno char(8)
            if offset + 8 > len(page): break
            sno = page[offset:offset+8].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 8

            # Sname varchar(20)
            if offset >= len(page): break
            slen = page[offset]
            offset += 1
            sname = page[offset:offset+slen].decode('utf-8', errors='replace').replace('\x00', '').strip() if slen > 0 else ''
            offset += slen

            # Ssex char(6)
            if offset + 6 > len(page): break
            ssex = page[offset:offset+6].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 6

            # Sage int (4 字节, big-endian)
            if offset + 4 > len(page): break
            sage = struct.unpack('>i', page[offset:offset+4])[0]
            offset += 4

            # Smajor varchar(40)
            if offset >= len(page): break
            mlen = page[offset]
            offset += 1
            smajor = page[offset:offset+mlen].decode('utf-8', errors='replace').replace('\x00', '').strip() if mlen > 0 else ''
            offset += mlen

            # S_entrance date (3 字节)
            if offset + 3 > len(page): break
            d = page[offset:offset+3]
            packed = (d[0] << 16) | (d[1] << 8) | d[2]
            year = packed // 512
            month = (packed % 512) // 32
            day = packed % 32
            sentrance = f"{year:04d}-{month:02d}-{day:02d}" if year > 0 and month > 0 and day > 0 else ''
            offset += 3

            # 武魂 varchar(10)
            if offset >= len(page): break
            wlen = page[offset]
            offset += 1
            wuhun = page[offset:offset+wlen].decode('utf-8', errors='replace').replace('\x00', '').strip() if wlen > 0 else ''

            # 过滤掉全是空或只有特殊字符的记录
            if sno and any(c.isalnum() for c in sno):
                records.append({
                    'Sno': sno, 'Sname': sname, 'Ssex': ssex, 'Sage': sage,
                    'Smajor': smajor, 'S_entrance': sentrance, '武魂': wuhun
                })
                print(f"  [{sno}] {sname} | {ssex} | {sage} | {smajor} | {sentrance} | {wuhun}", file=sys.stderr)
        except Exception as e:
            pass

        pos = next_off

    return records

def try_extract_course(page, page_no):
    """从 course 表提取记录"""
    ph = get_page_header(page)
    if ph['n_recs'] == 0 or ph['level'] != 0:
        return []

    records = []
    pos = 94
    while True:
        if pos + 2 > len(page):
            break
        next_off = struct.unpack('>H', page[pos:pos+2])[0]
        if next_off == 0 or next_off >= PAGE_SIZE:
            break
        if pos + 7 > len(page):
            break
        heap_no = struct.unpack('>H', page[pos+3:pos+5])[0] & 0x7FFF

        if heap_no <= 1:
            pos = next_off
            continue

        # course: Cno char(5), Cname varchar(40), Ccredit smallint(2), Cpno char(5)
        data_start = pos + 8  # 2(next_off) + 5(header) + 1(null_bitmap)
        offset = data_start

        try:
            # Cno char(5)
            if offset + 5 > len(page): break
            cno = page[offset:offset+5].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 5

            # Cname varchar(40)
            if offset >= len(page): break
            nlen = page[offset]
            offset += 1
            cname = page[offset:offset+nlen].decode('utf-8', errors='replace').replace('\x00', '').strip() if nlen > 0 else ''
            offset += nlen

            # Ccredit smallint (2 字节, big-endian)
            if offset + 2 > len(page): break
            ccredit = struct.unpack('>h', page[offset:offset+2])[0]
            offset += 2

            # Cpno char(5)
            if offset + 5 > len(page): break
            cpno = page[offset:offset+5].decode('utf-8', errors='replace').replace('\x00', '').strip()

            if cno and any(c.isalnum() for c in cno):
                records.append({
                    'Cno': cno, 'Cname': cname, 'Ccredit': ccredit, 'Cpno': cpno
                })
                print(f"  [{cno}] {cname} | {ccredit} | {cpno}", file=sys.stderr)
        except:
            pass

        pos = next_off
    return records

def try_extract_sc(page, page_no):
    """从 sc 表提取记录"""
    ph = get_page_header(page)
    if ph['n_recs'] == 0 or ph['level'] != 0:
        return []

    records = []
    pos = 94
    while True:
        if pos + 2 > len(page):
            break
        next_off = struct.unpack('>H', page[pos:pos+2])[0]
        if next_off == 0 or next_off >= PAGE_SIZE:
            break
        if pos + 7 > len(page):
            break
        heap_no = struct.unpack('>H', page[pos+3:pos+5])[0] & 0x7FFF

        if heap_no <= 1:
            pos = next_off
            continue

        # sc: Sno char(8), Cno char(5), Grade smallint(2), Semester char(5), Teachingclass char(8)
        data_start = pos + 8
        offset = data_start

        try:
            # Sno char(8)
            if offset + 8 > len(page): break
            sno = page[offset:offset+8].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 8

            # Cno char(5)
            if offset + 5 > len(page): break
            cno = page[offset:offset+5].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 5

            # Grade smallint
            if offset + 2 > len(page): break
            grade = struct.unpack('>h', page[offset:offset+2])[0]
            offset += 2

            # Semester char(5)
            if offset + 5 > len(page): break
            semester = page[offset:offset+5].decode('utf-8', errors='replace').replace('\x00', '').strip()
            offset += 5

            # Teachingclass char(8)
            if offset + 8 > len(page): break
            tclass = page[offset:offset+8].decode('utf-8', errors='replace').replace('\x00', '').strip()

            if sno and cno:
                records.append({
                    'Sno': sno, 'Cno': cno, 'Grade': grade,
                    'Semester': semester, 'Teachingclass': tclass
                })
                print(f"  [{sno},{cno}] Grade={grade} Sem={semester} Class={tclass}", file=sys.stderr)
        except:
            pass

        pos = next_off
    return records

def extract_table(table_name):
    t = TABLES[table_name]
    pages = read_ibd(t['file'])

    col_names = [c[0] for c in t['columns']]

    print(f"---{table_name}---", file=sys.stderr)
    print(f"读取 {len(pages)} 页", file=sys.stderr)

    extractors = {
        'student': try_extract_student,
        'course': try_extract_course,
        'sc': try_extract_sc
    }

    extractor = extractors.get(table_name)
    if not extractor:
        print(f"没有为 {table_name} 定义提取器", file=sys.stderr)
        return []

    all_records = []
    for i, page in enumerate(pages):
        pt = get_page_type(page)
        if pt == PAGE_TYPE_INDEX:
            recs = extractor(page, i)
            all_records.extend(recs)

    return all_records

def format_value(key, val, col_types):
    """格式化 SQL 值"""
    if val == '' or val is None:
        return 'NULL'
    if key == 'Sage' or key == 'Ccredit' or key == 'Grade':
        return str(val)
    if key == 'Year':
        return str(val)
    # 字符串需要转义单引号和双引号
    escaped = str(val).replace("'", "''").replace("\\", "\\\\")
    return f"'{escaped}'"

if __name__ == '__main__':
    if len(sys.argv) > 1:
        tables = sys.argv[1:]
        if 'all' in tables:
            tables = list(TABLES.keys())
    else:
        tables = ['student']

    for table_name in tables:
        if table_name not in TABLES:
            print(f"未知表: {table_name}", file=sys.stderr)
            continue

        t = TABLES[table_name]
        col_names = [c[0] for c in t['columns']]
        col_types = [c[1] for c in t['columns']]

        print(f"\n-- {table_name} (recovered from .ibd)")
        print(f"DELETE FROM `{table_name}`;")

        records = extract_table(table_name)
        if records:
            cols = ', '.join(f"`{n}`" for n in col_names)
            print(f"INSERT INTO `{table_name}` ({cols}) VALUES")
            value_rows = []
            for rec in records:
                vals = ', '.join(format_value(k, rec.get(k, ''), col_types) for k in col_names)
                value_rows.append(f"({vals})")
            print(',\n'.join(value_rows) + ';')
            print(f"-- {len(records)} 行恢复", file=sys.stderr)
        else:
            print(f"-- 未找到数据", file=sys.stderr)
