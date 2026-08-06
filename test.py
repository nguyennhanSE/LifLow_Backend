def csv_reader(fname):
    for row in open(fname,'r'):
        yield row
data = sum(1 for row in csv_reader('liflow_be/test.py'))