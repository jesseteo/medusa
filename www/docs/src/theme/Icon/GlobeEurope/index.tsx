import React from "react"
import { IconProps } from ".."

const IconGlobeEurope: React.FC<IconProps> = ({
  iconColorClassName,
  ...props
}) => {
  return (
    <svg
      width={props.width || 20}
      height={props.height || 20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17.4108 11.1609L16.465 10.2151C16.3226 10.0725 16.2042 9.90784 16.1142 9.72756L15.2142 7.92756C15.1897 7.87871 15.1539 7.83638 15.1099 7.80405C15.0658 7.77172 15.0147 7.75032 14.9607 7.74161C14.9068 7.7329 14.8515 7.73714 14.7995 7.75396C14.7475 7.77079 14.7003 7.79973 14.6617 7.8384C14.5747 7.92525 14.4661 7.98727 14.3472 8.01804C14.2282 8.04881 14.1031 8.04721 13.985 8.0134L12.9242 7.7109C12.7544 7.66318 12.5733 7.67749 12.4131 7.75126C12.253 7.82503 12.1244 7.95343 12.0503 8.11344C11.9763 8.27345 11.9617 8.4546 12.0091 8.62441C12.0566 8.79422 12.1629 8.94158 12.3092 9.04006L12.7983 9.36506C13.29 9.69423 13.36 10.3901 12.9417 10.8084L12.775 10.9751C12.5983 11.1517 12.5 11.3901 12.5 11.6384V11.9801C12.5 12.3209 12.4083 12.6542 12.2333 12.9451L11.1375 14.7709C10.9813 15.0314 10.7602 15.2471 10.4959 15.3968C10.2316 15.5465 9.93295 15.6251 9.62917 15.6251C9.396 15.6251 9.17238 15.5324 9.0075 15.3676C8.84263 15.2027 8.75 14.9791 8.75 14.7459V13.7692C8.75 13.0026 8.28334 12.3134 7.57167 12.0284L7.02583 11.8109C6.6287 11.6519 6.29787 11.3619 6.08823 10.989C5.8786 10.6162 5.80277 10.1828 5.87333 9.7609L5.87917 9.7259C5.91791 9.49407 5.99989 9.27159 6.12083 9.07006L6.19584 8.94506C6.39485 8.61365 6.69144 8.35186 7.04498 8.19552C7.39853 8.03919 7.79176 7.99595 8.17084 8.07173L9.1525 8.2684C9.38351 8.31447 9.6234 8.2719 9.82445 8.14914C10.0255 8.02638 10.173 7.83244 10.2375 7.6059L10.4108 6.99756C10.4709 6.7874 10.4556 6.56286 10.3677 6.36277C10.2797 6.16267 10.1246 5.99959 9.92917 5.90173L9.375 5.62506L9.29917 5.7009C9.12506 5.87501 8.91836 6.01312 8.69087 6.10734C8.46338 6.20157 8.21956 6.25006 7.97333 6.25006H7.82333C7.61583 6.25006 7.4175 6.3334 7.27167 6.4784C7.13802 6.61326 6.95955 6.69443 6.77006 6.70653C6.58058 6.71864 6.39323 6.66084 6.2435 6.54407C6.09378 6.42731 5.99207 6.2597 5.95763 6.07297C5.9232 5.88625 5.95844 5.69338 6.05667 5.5309L7.2325 3.57006C7.3497 3.37515 7.43046 3.16055 7.47084 2.93673M17.4108 11.1609C17.6127 9.87518 17.4765 8.55906 17.0156 7.34192C16.5548 6.12478 15.7851 5.04851 14.7824 4.2189C13.7796 3.3893 12.5782 2.83493 11.2962 2.61027C10.0143 2.38561 8.69597 2.4984 7.47084 2.93756C6.22444 3.38434 5.11853 4.15312 4.2655 5.16578C3.41247 6.17843 2.84273 7.39886 2.61417 8.70304C2.38562 10.0072 2.50639 11.3487 2.96423 12.591C3.42206 13.8334 4.20063 14.9325 5.22082 15.7765C6.24101 16.6205 7.46645 17.1793 8.77261 17.3963C10.0788 17.6133 11.4191 17.4806 12.6574 17.0117C13.8956 16.5429 14.9877 15.7546 15.8226 14.7269C16.6575 13.6993 17.2055 12.4689 17.4108 11.1609Z"
        className={
          iconColorClassName ||
          "stroke-medusa-fg-subtle dark:stroke-medusa-fg-subtle-dark"
        }
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default IconGlobeEurope
