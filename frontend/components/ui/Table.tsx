import React, { TableHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

export const Table: React.FC<TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto border-2 border-black rounded-xl shadow-hard-sm bg-white">
      <table className={cn('w-full text-left border-collapse text-xs md:text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead className={cn('bg-brand-yellow border-b-2 border-black font-black uppercase text-[11px] text-brand-dark', className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn('divide-y-2 divide-gray-100', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr className={cn('hover:bg-gray-50 transition-colors', className)} {...props}>
    {children}
  </tr>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={cn('p-3 font-medium text-gray-800', className)} {...props}>
    {children}
  </td>
);

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={cn('p-3 tracking-wider', className)} {...props}>
    {children}
  </th>
);
