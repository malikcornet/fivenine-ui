import { Dropdown, DropdownItem } from '@fivenine-collective/react';

export default function DropdownEndAligned() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Dropdown label="Options" align="end">
        <DropdownItem>Rename</DropdownItem>
        <DropdownItem>Duplicate</DropdownItem>
        <DropdownItem>Delete</DropdownItem>
      </Dropdown>
    </div>
  );
}
