import { Dropdown, DropdownItem } from '@fivenine/react';

export default function DropdownBasic() {
  return (
    <Dropdown label="Options">
      <DropdownItem>Rename</DropdownItem>
      <DropdownItem>Duplicate</DropdownItem>
      <DropdownItem>Delete</DropdownItem>
    </Dropdown>
  );
}
